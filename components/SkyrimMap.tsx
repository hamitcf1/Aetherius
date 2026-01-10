import React, { useState, useRef, useEffect } from 'react';
import { X, MapPin, Compass, ZoomIn, ZoomOut, Navigation } from 'lucide-react';

// Major Skyrim locations with coordinates matching the actual Skyrim map image
// Coordinates are percentage-based (0-100) matching the provided map
export interface MapLocation {
  id: string;
  name: string;
  type: 'city' | 'town' | 'village' | 'dungeon' | 'landmark' | 'camp' | 'fort' | 'ruin' | 'cave';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  hold?: string;
  description?: string;
}

// Coordinates adjusted to match the actual Skyrim map image
export const SKYRIM_LOCATIONS: MapLocation[] = [
  // Major Cities (Hold Capitals) - adjusted to match map image
  { id: 'whiterun', name: 'Whiterun', type: 'city', x: 46, y: 55, hold: 'Whiterun Hold', description: 'The central trade hub of Skyrim' },
  { id: 'solitude', name: 'Solitude', type: 'city', x: 18, y: 17, hold: 'Haafingar', description: 'Capital of Skyrim, seat of the High King' },
  { id: 'windhelm', name: 'Windhelm', type: 'city', x: 83, y: 32, hold: 'Eastmarch', description: 'Ancient Nord city, Stormcloak capital' },
  { id: 'riften', name: 'Riften', type: 'city', x: 90, y: 78, hold: 'The Rift', description: 'Home of the Thieves Guild' },
  { id: 'markarth', name: 'Markarth', type: 'city', x: 8, y: 52, hold: 'The Reach', description: 'Dwemer city carved into the mountain' },
  { id: 'falkreath', name: 'Falkreath', type: 'city', x: 32, y: 82, hold: 'Falkreath Hold', description: 'A somber town known for its cemetery' },
  { id: 'morthal', name: 'Morthal', type: 'city', x: 30, y: 30, hold: 'Hjaalmarch', description: 'Mysterious swamp town' },
  { id: 'dawnstar', name: 'Dawnstar', type: 'city', x: 48, y: 12, hold: 'The Pale', description: 'Northern mining town plagued by nightmares' },
  { id: 'winterhold', name: 'Winterhold', type: 'city', x: 72, y: 10, hold: 'Winterhold', description: 'Home of the College of Winterhold' },
  
  // Towns & Villages - adjusted to match map image
  { id: 'riverwood', name: 'Riverwood', type: 'village', x: 40, y: 68, hold: 'Whiterun Hold', description: 'Peaceful lumber village' },
  { id: 'rorikstead', name: 'Rorikstead', type: 'village', x: 22, y: 50, hold: 'Whiterun Hold', description: 'Farming community' },
  { id: 'ivarstead', name: 'Ivarstead', type: 'village', x: 65, y: 65, hold: 'The Rift', description: 'Base of the 7000 steps' },
  { id: 'helgen', name: 'Helgen', type: 'town', x: 38, y: 78, hold: 'Falkreath Hold', description: 'Destroyed by Alduin' },
  { id: 'dragon_bridge', name: 'Dragon Bridge', type: 'village', x: 15, y: 25, hold: 'Haafingar', description: 'Named for its ancient dragon bridge' },
  { id: 'karthwasten', name: 'Karthwasten', type: 'village', x: 12, y: 45, hold: 'The Reach', description: 'Silver mining village' },
  { id: 'shors_stone', name: "Shor's Stone", type: 'village', x: 82, y: 62, hold: 'The Rift', description: 'Mining village' },
  { id: 'kynesgrove', name: 'Kynesgrove', type: 'village', x: 75, y: 42, hold: 'Eastmarch', description: 'Small mining settlement' },
  { id: 'darkwater_crossing', name: 'Darkwater Crossing', type: 'village', x: 72, y: 55, hold: 'Eastmarch', description: 'Corundum mining camp' },
  
  // Notable Landmarks
  { id: 'high_hrothgar', name: 'High Hrothgar', type: 'landmark', x: 58, y: 58, description: 'Home of the Greybeards' },
  { id: 'throat_of_world', name: 'Throat of the World', type: 'landmark', x: 58, y: 55, description: 'Highest peak in Tamriel' },
  { id: 'college_winterhold', name: 'College of Winterhold', type: 'landmark', x: 74, y: 8, hold: 'Winterhold', description: 'School of magic' },
  { id: 'sky_haven_temple', name: 'Sky Haven Temple', type: 'landmark', x: 15, y: 62, hold: 'The Reach', description: 'Ancient Blades sanctuary' },
  { id: 'sovngarde', name: 'Sovngarde', type: 'landmark', x: 55, y: 48, description: 'Nordic afterlife (portal location)' },
  
  // Major Dungeons/Ruins
  { id: 'bleak_falls_barrow', name: 'Bleak Falls Barrow', type: 'dungeon', x: 38, y: 65, hold: 'Whiterun Hold', description: 'Ancient Nordic tomb' },
  { id: 'labyrinthian', name: 'Labyrinthian', type: 'ruin', x: 35, y: 32, hold: 'Hjaalmarch', description: 'Ancient Nordic city ruins' },
  { id: 'blackreach', name: 'Blackreach', type: 'dungeon', x: 50, y: 42, description: 'Vast underground Dwemer city' },
  { id: 'skuldafn', name: 'Skuldafn', type: 'ruin', x: 92, y: 38, description: 'Dragon priest temple' },
  { id: 'dustmans_cairn', name: "Dustman's Cairn", type: 'dungeon', x: 42, y: 48, hold: 'Whiterun Hold', description: 'Companions trial location' },
  { id: 'ustengrav', name: 'Ustengrav', type: 'dungeon', x: 36, y: 22, hold: 'Hjaalmarch', description: 'Ancient Nordic tomb' },
  
  // Forts
  { id: 'fort_dawnguard', name: 'Fort Dawnguard', type: 'fort', x: 94, y: 72, hold: 'The Rift', description: 'Dawnguard headquarters' },
  { id: 'fort_hraggstad', name: 'Fort Hraggstad', type: 'fort', x: 12, y: 12, hold: 'Haafingar', description: 'Imperial fort' },
  
  // Caves & Camps
  { id: 'embershard_mine', name: 'Embershard Mine', type: 'cave', x: 39, y: 72, hold: 'Falkreath Hold', description: 'Bandit-occupied mine' },
  { id: 'halted_stream_camp', name: 'Halted Stream Camp', type: 'camp', x: 45, y: 48, hold: 'Whiterun Hold', description: 'Bandit camp with mammoth tusks' },
];

// Function to find location by name (fuzzy match)
export const findLocationByName = (name: string): MapLocation | undefined => {
  const normalized = name.toLowerCase().trim();
  
  // Exact match first
  let found = SKYRIM_LOCATIONS.find(loc => loc.name.toLowerCase() === normalized);
  if (found) return found;
  
  // Partial match
  found = SKYRIM_LOCATIONS.find(loc => loc.name.toLowerCase().includes(normalized) || normalized.includes(loc.name.toLowerCase()));
  if (found) return found;
  
  // Word match
  const words = normalized.split(/\s+/);
  found = SKYRIM_LOCATIONS.find(loc => {
    const locWords = loc.name.toLowerCase().split(/\s+/);
    return words.some(w => locWords.some(lw => lw.includes(w) || w.includes(lw)));
  });
  
  return found;
};

interface SkyrimMapProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: string; // Name of current location
  visitedLocations?: string[]; // Names of visited locations
  questLocations?: Array<{ name: string; questName: string }>; // Quest markers
}

export const SkyrimMap: React.FC<SkyrimMapProps> = ({
  isOpen,
  onClose,
  currentLocation,
  visitedLocations = [],
  questLocations = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Find current location object
  const currentLocationObj = currentLocation ? findLocationByName(currentLocation) : undefined;

  // Center on current location when opened
  useEffect(() => {
    if (isOpen && currentLocationObj) {
      // Center the map on current location
      setPan({
        x: -(currentLocationObj.x - 50) * zoom,
        y: -(currentLocationObj.y - 50) * zoom,
      });
    }
  }, [isOpen, currentLocationObj, zoom]);

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const getMarkerColor = (location: MapLocation): string => {
    if (currentLocationObj?.id === location.id) return 'text-green-400';
    if (visitedLocations.some(v => findLocationByName(v)?.id === location.id)) return 'text-blue-400';
    if (questLocations.some(q => findLocationByName(q.name)?.id === location.id)) return 'text-yellow-400';
    
    switch (location.type) {
      case 'city': return 'text-skyrim-gold';
      case 'town': return 'text-amber-500';
      case 'village': return 'text-amber-600';
      case 'dungeon': return 'text-red-500';
      case 'landmark': return 'text-purple-400';
      case 'fort': return 'text-gray-400';
      case 'ruin': return 'text-orange-500';
      case 'cave': return 'text-gray-500';
      case 'camp': return 'text-yellow-600';
      default: return 'text-gray-400';
    }
  };

  const getMarkerSize = (location: MapLocation): number => {
    if (currentLocationObj?.id === location.id) return 28;
    switch (location.type) {
      case 'city': return 24;
      case 'town': return 18;
      case 'village': return 14;
      case 'landmark': return 20;
      default: return 12;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-skyrim-gold/30 bg-black/80">
        <div className="flex items-center gap-3">
          <Compass className="text-skyrim-gold" size={28} />
          <div>
            <h2 className="text-2xl font-serif text-skyrim-gold">Map of Skyrim</h2>
            {currentLocation && (
              <p className="text-sm text-gray-400">
                Current Location: <span className="text-green-400">{currentLocation}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
              className="p-2 bg-black/60 border border-skyrim-gold/50 rounded hover:bg-skyrim-gold/20 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={18} className="text-skyrim-gold" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
              className="p-2 bg-black/60 border border-skyrim-gold/50 rounded hover:bg-skyrim-gold/20 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={18} className="text-skyrim-gold" />
            </button>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`px-3 py-2 border rounded transition-colors text-sm ${
                showLabels 
                  ? 'bg-skyrim-gold/20 border-skyrim-gold text-skyrim-gold' 
                  : 'bg-black/60 border-gray-600 text-gray-400'
              }`}
            >
              Labels
            </button>
            {currentLocationObj && (
              <button
                onClick={() => {
                  setPan({
                    x: -(currentLocationObj.x - 50) * zoom,
                    y: -(currentLocationObj.y - 50) * zoom,
                  });
                }}
                className="p-2 bg-black/60 border border-green-500/50 rounded hover:bg-green-500/20 transition-colors"
                title="Center on current location"
              >
                <Navigation size={18} className="text-green-400" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Map Background */}
        <div 
          className="absolute inset-0 transition-transform duration-100"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Skyrim Map Image - Using the actual game map */}
          <div className="relative w-full h-full" style={{ minWidth: '900px', minHeight: '700px' }}>
            {/* Actual Skyrim map image as background */}
            {!imageError ? (
              <img 
                src="/skyrim-map.jpg" 
                alt="Map of Skyrim"
                className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ minWidth: '900px', minHeight: '700px' }}
                draggable={false}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              /* Fallback stylized map if image fails to load */
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid slice" style={{ minWidth: '900px', minHeight: '700px' }}>
                <defs>
                  <linearGradient id="skyrimBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2a2a1a" />
                    <stop offset="100%" stopColor="#1a1a0a" />
                  </linearGradient>
                </defs>
                <rect width="100" height="100" fill="url(#skyrimBg)" />
                <text x="50" y="50" textAnchor="middle" fill="#8B7355" fontSize="4" fontFamily="serif">SKYRIM</text>
                <text x="50" y="55" textAnchor="middle" fill="#666" fontSize="2">Map image not found - save skyrim-map.jpg to public folder</text>
              </svg>
            )}
            
            {/* Loading indicator */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-skyrim-gold animate-pulse">Loading map...</div>
              </div>
            )}

            {/* Location Markers overlaid on map */}
            {SKYRIM_LOCATIONS.map(location => {
              const isQuest = questLocations.some(q => findLocationByName(q.name)?.id === location.id);
              const isCurrent = currentLocationObj?.id === location.id;
              const size = getMarkerSize(location);
              
              return (
                <div
                  key={location.id}
                  className={`absolute cursor-pointer transition-all duration-200 hover:scale-125 ${
                    isCurrent ? 'animate-pulse z-20' : 'z-10'
                  }`}
                  style={{
                    left: `${location.x}%`,
                    top: `${location.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => setSelectedLocation(location)}
                  title={location.name}
                >
                  {/* Custom marker design for better visibility on the map */}
                  <div className={`relative ${isCurrent ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'drop-shadow-lg'}`}>
                    <MapPin 
                      size={size} 
                      className={`${getMarkerColor(location)} ${isCurrent ? 'fill-current' : ''}`}
                      fill={isCurrent ? 'currentColor' : 'none'}
                      strokeWidth={2.5}
                    />
                    {/* Glow effect for current location */}
                    {isCurrent && (
                      <div className="absolute inset-0 -m-1">
                        <MapPin 
                          size={size + 4} 
                          className="text-green-400 opacity-50 animate-ping"
                          fill="currentColor"
                        />
                      </div>
                    )}
                  </div>
                  {/* Quest indicator */}
                  {isQuest && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                  )}
                  {/* Labels */}
                  {showLabels && (location.type === 'city' || location.type === 'town' || isCurrent) && (
                    <span 
                      className={`absolute left-full ml-1 text-xs whitespace-nowrap font-bold px-1 rounded ${
                        isCurrent 
                          ? 'text-green-400 bg-black/80' 
                          : 'text-white bg-black/70'
                      }`}
                      style={{ textShadow: '1px 1px 2px black, -1px -1px 2px black' }}
                    >
                      {location.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Details Popup */}
        {selectedLocation && (
          <div className="absolute bottom-4 left-4 bg-black/90 border border-skyrim-gold/50 rounded-lg p-4 max-w-sm z-30">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-serif text-skyrim-gold">{selectedLocation.name}</h3>
                <span className={`text-xs uppercase ${getMarkerColor(selectedLocation)}`}>
                  {selectedLocation.type}
                </span>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            {selectedLocation.hold && (
              <p className="text-sm text-gray-400 mb-1">Hold: {selectedLocation.hold}</p>
            )}
            {selectedLocation.description && (
              <p className="text-sm text-gray-300">{selectedLocation.description}</p>
            )}
            {currentLocationObj?.id === selectedLocation.id && (
              <p className="text-sm text-green-400 mt-2">📍 You are here</p>
            )}
            {questLocations.find(q => findLocationByName(q.name)?.id === selectedLocation.id) && (
              <p className="text-sm text-yellow-400 mt-2">
                ⚔️ Quest: {questLocations.find(q => findLocationByName(q.name)?.id === selectedLocation.id)?.questName}
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-black/80 border border-skyrim-gold/30 rounded-lg p-3 text-xs z-30">
          <h4 className="text-skyrim-gold font-semibold mb-2">Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-green-400 fill-current" />
              <span className="text-green-400">Current Location</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-yellow-400" />
              <span className="text-yellow-400">Quest Objective</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-blue-400" />
              <span className="text-blue-400">Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-skyrim-gold" />
              <span className="text-gray-400">City</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-amber-500" />
              <span className="text-gray-400">Town/Village</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-red-500" />
              <span className="text-gray-400">Dungeon</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 bg-black/60 rounded px-3 py-2 text-xs text-gray-500 z-30">
          Drag to pan • Scroll to zoom • Click markers for details
        </div>
      </div>
    </div>
  );
};

export default SkyrimMap;
