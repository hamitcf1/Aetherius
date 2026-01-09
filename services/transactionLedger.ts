/**
 * Transaction Ledger - Prevents duplicate charges from AI responses
 * 
 * Problem: AI can include goldChange in BOTH:
 * 1. The initial response showing options (preview)
 * 2. The follow-up response executing the choice
 * 
 * This causes double/triple charging for a single logical transaction.
 * 
 * Solution: Track transaction IDs and reject duplicates.
 */

interface Transaction {
  id: string;
  type: 'gold' | 'items' | 'mixed';
  goldAmount?: number;
  items?: Array<{ name: string; quantity: number; added: boolean }>;
  timestamp: number;
  characterId: string;
}

class TransactionLedger {
  private completedTransactions: Map<string, Transaction> = new Map();
  private characterId: string | null = null;
  
  // Maximum age before a transaction ID is forgotten (prevents memory leak)
  private readonly MAX_TRANSACTION_AGE_MS = 30 * 60 * 1000; // 30 minutes

  setCharacter(characterId: string | null) {
    if (characterId !== this.characterId) {
      // Clear old transactions when switching characters
      this.completedTransactions.clear();
      this.characterId = characterId;
    }
  }

  /**
   * Check if a transaction has already been completed
   */
  hasTransaction(transactionId: string): boolean {
    this.cleanupOldTransactions();
    return this.completedTransactions.has(transactionId);
  }

  /**
   * Record a completed transaction
   */
  recordTransaction(
    transactionId: string,
    details: {
      goldAmount?: number;
      items?: Array<{ name: string; quantity: number; added: boolean }>;
    }
  ): void {
    if (!this.characterId) return;
    
    let type: Transaction['type'] = 'mixed';
    if (details.goldAmount && !details.items?.length) type = 'gold';
    else if (!details.goldAmount && details.items?.length) type = 'items';
    
    this.completedTransactions.set(transactionId, {
      id: transactionId,
      type,
      goldAmount: details.goldAmount,
      items: details.items,
      timestamp: Date.now(),
      characterId: this.characterId
    });
  }

  /**
   * Generate a unique transaction ID
   */
  generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if a gold change should be applied, considering:
   * 1. If there's a transaction ID that's already been processed
   * 2. If this is a preview response (showing options, not executing)
   */
  shouldApplyGoldChange(
    goldChange: number | undefined,
    transactionId?: string,
    isPreview?: boolean
  ): { apply: boolean; reason: string } {
    // No change to apply
    if (typeof goldChange !== 'number' || goldChange === 0) {
      return { apply: false, reason: 'no_change' };
    }

    // Preview responses show costs but don't execute them
    if (isPreview) {
      return { apply: false, reason: 'preview_only' };
    }

    // Check for duplicate transaction
    if (transactionId && this.hasTransaction(transactionId)) {
      return { apply: false, reason: 'duplicate_transaction' };
    }

    // Should apply this gold change
    return { apply: true, reason: 'valid' };
  }

  /**
   * Remove transactions older than MAX_TRANSACTION_AGE_MS
   */
  private cleanupOldTransactions(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.completedTransactions.forEach((txn, id) => {
      if (now - txn.timestamp > this.MAX_TRANSACTION_AGE_MS) {
        toDelete.push(id);
      }
    });
    
    toDelete.forEach(id => this.completedTransactions.delete(id));
  }

  /**
   * Get recent transactions (for debugging)
   */
  getRecentTransactions(limit: number = 10): Transaction[] {
    return Array.from(this.completedTransactions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear all transactions (for testing/reset)
   */
  reset(): void {
    this.completedTransactions.clear();
  }
}

// Singleton instance
let ledgerInstance: TransactionLedger | null = null;

export function getTransactionLedger(): TransactionLedger {
  if (!ledgerInstance) {
    ledgerInstance = new TransactionLedger();
  }
  return ledgerInstance;
}

// Utility: Filter out duplicate/preview gold changes from a GameStateUpdate
export function filterDuplicateTransactions(
  update: {
    goldChange?: number;
    transactionId?: string;
    isPreview?: boolean;
    newItems?: Array<any>;
    removedItems?: Array<any>;
  }
): {
  filteredUpdate: typeof update;
  wasFiltered: boolean;
  reason: string;
} {
  const ledger = getTransactionLedger();
  const result = ledger.shouldApplyGoldChange(
    update.goldChange,
    update.transactionId,
    update.isPreview
  );

  if (!result.apply && update.goldChange) {
    // Remove the gold change but keep other updates
    const { goldChange, ...rest } = update;
    
    return {
      filteredUpdate: rest,
      wasFiltered: true,
      reason: result.reason
    };
  }

  // If applying, record the transaction
  if (result.apply && update.transactionId) {
    ledger.recordTransaction(update.transactionId, {
      goldAmount: update.goldChange
    });
  }

  return {
    filteredUpdate: update,
    wasFiltered: false,
    reason: 'applied'
  };
}
