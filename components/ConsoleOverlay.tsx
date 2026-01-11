import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ConsoleOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string) => void;
}

export const ConsoleOverlay: React.FC<ConsoleOverlayProps> = ({
  isOpen,
  onClose,
  onExecuteCommand
}) => {
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [output, setOutput] = useState<string[]>([
    'Skyrim Aetherius Developer Console',
    'Type demo.help() for available commands',
    'Type "exit" or press ESC to close',
    '---'
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const executeCommand = (command: string) => {
    if (!command.trim()) return;

    // Add to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Add command to output
    setOutput(prev => [...prev, `> ${command}`]);

    // Execute command
    try {
      if (command.toLowerCase() === 'exit' || command.toLowerCase() === 'quit') {
        onClose();
        return;
      }

      if (command.toLowerCase() === 'clear') {
        setOutput(['Console cleared']);
        return;
      }

      if (command.toLowerCase() === 'history') {
        setOutput(prev => [...prev, 'Command History:', ...commandHistory.map((cmd, i) => `${i + 1}: ${cmd}`)]);
        return;
      }

      // Execute the command in global scope
      const result = (window as any).eval(command);

      // Add result to output
      if (result !== undefined) {
        setOutput(prev => [...prev, String(result)]);
      } else {
        setOutput(prev => [...prev, 'Command executed']);
      }
    } catch (error) {
      setOutput(prev => [...prev, `Error: ${error.message}`]);
    }

    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(inputValue);
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInputValue('');
        } else {
          setHistoryIndex(newIndex);
          setInputValue(commandHistory[newIndex]);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="text-white font-mono text-sm">Developer Console</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Output Area */}
        <div
          ref={outputRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-gray-950 text-green-400"
          style={{ maxHeight: 'calc(100% - 120px)' }}
        >
          {output.map((line, index) => (
            <div key={index} className="mb-1">
              {line}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-mono text-sm">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder-gray-500"
              placeholder="Enter command..."
              spellCheck={false}
              autoComplete="off"
            />
            <div className="flex gap-1 text-gray-500 text-xs">
              <ChevronUp className="w-3 h-3" />
              <ChevronDown className="w-3 h-3" />
              <span>History</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Press Enter to execute, ESC to close, ↑/↓ for history
          </div>
        </div>
      </div>
    </div>
  );
};