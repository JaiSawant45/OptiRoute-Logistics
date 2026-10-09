import React, { useEffect, useRef, useState } from 'react';
import type { Customer, Depot, Solution, Vehicle } from '../../types/logistics';
import { getExactRoadGeometryForRoute } from '../../utils/roadRouting';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Truck, 
  Package,
  Layers,
  Globe,
  Plus,
  CheckCircle2,
  X,
  MapPin,
  Sparkles,
  Undo2,
  Maximize2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RoutePlannerMapTabProps {
  depot: Depot;
  customers: Customer[];
  solution: Solution;
  currentGen: number;
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  onStepGen: () => void;
  speed: number;
  setSpeed: (s: number) => void;
  activeCityName: string;
  onAddCustomFleet: (newVehicle: Vehicle, newCustomers: Customer[]) => void;
}

export const RoutePlannerMapTab: React.FC<RoutePlannerMapTabProps> = ({
  depot,
  customers,
  solution,
  currentGen,
  isRunning,
  onToggleRun,
  onReset,
  onStepGen,
  speed,
  setSpeed,
  activeCityName,
  onAddCustomFleet
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayTileLayerRef = useRef<L.TileLayer | null>(null);
  const roadLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tempPlottingLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Map Mode: 'satellite' | 'sentinel' | 'streets' | 'dark'
  const [mapMode, setMapMode] = useState<'satellite' | 'sentinel' | 'streets' | 'dark'>('satellite');
  const [mapReady, setMapReady] = useState<number>(0);
  const [hoveredCustomer, setHoveredCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [hoveredRouteIdx, setHoveredRouteIdx] = useState<number | null>(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number | null>(null);
  
  // Real road paths cache keyed by vehicle id + stop sequence
  const [tracedRoadPaths, setTracedRoadPaths] = useState<{ [vehId: string]: [number, number][] }>({});

  // Add Fleet & Point Plotting State
  const [showAddFleetModal, setShowAddFleetModal] = useState(false);
  const [isPlottingMode, setIsPlottingMode] = useState(false);
  const [plottedPoints, setPlottedPoints] = useState<[number, number][]>([]);

  // Form inputs for new vehicle
  const [newVehName, setNewVehName] = useState('Express Logistics Van #4');
  const [newVehType, setNewVehType] = useState<'EV_VAN' | 'ICE_TRUCK' | 'CARGO_EBIKE'>('EV_VAN');
  const [newVehPayload, setNewVehPayload] = useState<number>(750);
  const [newVehColor, setNewVehColor] = useState<string>('#a855f7'); // purple

  const formatMin = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h % 12 || 12}:${min < 10 ? '0' : ''}${min} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // Base Map Layer Switcher
  const updateBaseTileLayer = (mode: 'dark' | 'satellite' | 'sentinel' | 'streets', targetMap?: L.Map) => {
    const map = targetMap || mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (overlayTileLayerRef.current) {
      map.removeLayer(overlayTileLayerRef.current);
      overlayTileLayerRef.current = null;
    }

    if (mode === 'dark') {
      baseTileLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution: '© OpenStreetMap © CARTO'
        }
      ).addTo(map);
    } else if (mode === 'sentinel') {
      baseTileLayerRef.current = L.tileLayer(
        'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/GoogleMapsCompatible/{z}/{x}/{y}.jpg',
        {
          maxZoom: 18,
          attribution: 'Sentinel-2 Cloudless © EOX IT Services GmbH'
        }
      ).addTo(map);

      overlayTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, opacity: 0.85 }
      ).addTo(map);

    } else if (mode === 'satellite') {
      baseTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          attribution: 'Tiles © Esri, Maxar'
        }
      ).addTo(map);

      overlayTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, opacity: 0.85 }
      ).addTo(map);

    } else {
      baseTileLayerRef.current = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }
      ).addTo(map);
    }

    setMapMode(mode);
  };

  // Initialize Map Once per Depot
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true
    }).setView([depot.lat, depot.lng], 12);

    mapInstanceRef.current = map;

    // Load initial map layer
    updateBaseTileLayer(mapMode, map);

    roadLayerGroupRef.current = L.layerGroup().addTo(map);
    markerLayerGroupRef.current = L.layerGroup().addTo(map);
    tempPlottingLayerGroupRef.current = L.layerGroup().addTo(map);

    // Force Leaflet to refresh container size and safely fit bounds without NaN zoom
    const safeFitAndSize = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.invalidateSize(true);
      const size = mapInstanceRef.current.getSize();
      if (size.x > 80 && size.y > 80) {
        const allCoords: [number, number][] = [
          [depot.lat, depot.lng],
          ...customers.map(c => [c.lat, c.lng] as [number, number])
        ];
        if (allCoords.length > 1) {
          const bounds = L.latLngBounds(allCoords);
          mapInstanceRef.current.fitBounds(bounds, {
            paddingTopLeft: [55, 55],
            paddingBottomRight: [60, 85],
            maxZoom: 12
          });
        }
      }
    };

    const t1 = setTimeout(safeFitAndSize, 100);
    const t2 = setTimeout(safeFitAndSize, 350);
    const t3 = setTimeout(safeFitAndSize, 800);

    const onWindowResize = () => safeFitAndSize();
    window.addEventListener('resize', onWindowResize);

    // ResizeObserver ensures Leaflet updates whenever DOM dimensions adapt
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ debounceMoveend: true });
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    setMapReady(prev => prev + 1);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', onWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, [depot.id]);

  // Public helper to fit all delivery drops & depot in view
  const fitAllLocations = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.invalidateSize(true);
    const allCoords: [number, number][] = [
      [depot.lat, depot.lng],
      ...customers.map(c => [c.lat, c.lng] as [number, number])
    ];
    if (allCoords.length > 1) {
      const bounds = L.latLngBounds(allCoords);
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: [55, 55],
        paddingBottomRight: [60, 85],
        maxZoom: 12
      });
    }
  };

  // Click on Map Event when Plotting Mode is Active
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (!isPlottingMode) return;
      const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPlottedPoints(prev => [...prev, newPt]);
    };

    map.on('click', onMapClick);

    return () => {
      map.off('click', onMapClick);
    };
  }, [isPlottingMode]);

  // Render Temporary Plotted Points on Map during Plotting Mode
  useEffect(() => {
    if (!tempPlottingLayerGroupRef.current) return;
    const group = tempPlottingLayerGroupRef.current;
    group.clearLayers();

    if (!isPlottingMode) return;

    plottedPoints.forEach((pt, idx) => {
      const pinIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="map-cust-pin plotting-pin" style="background: ${newVehColor}; border-color: #ffffff;">
            <span>${idx + 1}</span>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const m = L.marker(pt, { icon: pinIcon })
        .bindTooltip(`<strong>New Stop #${idx + 1}</strong><br/>(${pt[0].toFixed(4)}, ${pt[1].toFixed(4)})`, {
          permanent: true,
          direction: 'top',
          offset: [0, -12]
        });

      group.addLayer(m);
    });
  }, [isPlottingMode, plottedPoints, newVehColor, mapReady]);

  // Asynchronously resolve true driving road network from OSRM for all vehicles
  useEffect(() => {
    let isCancelled = false;

    async function traceAllVehicleRoads() {
      const pathsMap: { [vehId: string]: [number, number][] } = {};

      for (const route of solution.routes) {
        if (isCancelled) return;
        const roadCoords = await getExactRoadGeometryForRoute(
          { lat: depot.lat, lng: depot.lng },
          route.stops.map(s => ({ lat: s.customer.lat, lng: s.customer.lng }))
        );
        pathsMap[route.vehicle.id] = roadCoords;
      }

      if (!isCancelled) {
        setTracedRoadPaths(pathsMap);
      }
    }

    traceAllVehicleRoads();

    return () => {
      isCancelled = true;
    };
  }, [solution, depot]);

  // Update Road Polylines on roadLayerGroup with High-Contrast Outlines against Satellite
  useEffect(() => {
    if (!mapInstanceRef.current || !roadLayerGroupRef.current) return;
    const roadGroup = roadLayerGroupRef.current;
    roadGroup.clearLayers();

    solution.routes.forEach((route, rIdx) => {
      const isSelected = selectedRouteIdx === null || selectedRouteIdx === rIdx;
      const isHovered = hoveredRouteIdx === rIdx;

      const roadPath = tracedRoadPaths[route.vehicle.id] || [
        [depot.lat, depot.lng],
        ...route.stops.map(s => [s.customer.lat, s.customer.lng] as [number, number]),
        [depot.lat, depot.lng]
      ];

      const weight = isHovered ? 7 : isSelected ? 4.5 : 2.5;
      const opacity = isSelected ? (isHovered ? 1.0 : 0.95) : 0.25;

      const casingLine = L.polyline(roadPath, {
        color: '#000000',
        weight: weight + 3.5,
        opacity: isSelected ? 0.8 : 0.2,
        lineCap: 'round',
        lineJoin: 'round'
      });
      roadGroup.addLayer(casingLine);

      const mainLine = L.polyline(roadPath, {
        color: route.vehicle.color,
        weight,
        opacity,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isSelected ? undefined : '6, 8',
        className: isRunning ? 'route-optimizing-pulse' : ''
      });

      // Animated high-tech laser flow line when GA is actively optimizing best route
      if (isRunning && isSelected) {
        const flowPulseLine = L.polyline(roadPath, {
          color: '#ffffff',
          weight: Math.max(2.8, weight - 1.2),
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '10, 20',
          className: 'running-ga-flow-line'
        });
        roadGroup.addLayer(flowPulseLine);
      }

      mainLine.on('mouseover', () => setHoveredRouteIdx(rIdx));
      mainLine.on('mouseout', () => setHoveredRouteIdx(null));
      mainLine.on('click', () => setSelectedRouteIdx(selectedRouteIdx === rIdx ? null : rIdx));

      mainLine.bindTooltip(`
        <div style="font-family: inherit; font-size: 12px; padding: 2px;">
          <strong style="color: ${route.vehicle.color}; font-size: 13px;">${route.vehicle.name}</strong><br/>
          <span>Traced Road: <strong>${route.totalDistanceKm} km</strong> (${route.stops.length} Drops)</span><br/>
          <span>Payload: ${route.totalLoadKg} / ${route.vehicle.maxCapacityKg} kg (${route.capacityUtilizationPct}%)</span>
        </div>
      `, { sticky: true, opacity: 0.95 });

      roadGroup.addLayer(mainLine);
    });
  }, [solution, depot, tracedRoadPaths, selectedRouteIdx, hoveredRouteIdx, mapReady, isRunning]);

  // Update Markers on markerLayerGroup
  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerGroupRef.current) return;
    const markerGroup = markerLayerGroupRef.current;
    markerGroup.clearLayers();

    // 1. Central Depot Warehouse
    const depotIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="map-depot-pin">
          <div class="depot-pulse ${isRunning ? 'is-running-ga' : ''}"></div>
          <div class="depot-core">🏢</div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const depotMarker = L.marker([depot.lat, depot.lng], { icon: depotIcon });
    depotMarker.bindTooltip(`
      <div class="map-hover-card">
        <div class="hover-card-title">🏢 ${depot.name}</div>
        <div class="hover-card-sub">${depot.hubName}</div>
        <div class="hover-badge bg-emerald">Central Mother Hub & Fleet Dispatch</div>
        <div class="hover-detail-row">
          <span>Active Capacity:</span>
          <strong>${depot.vehicleCapacity} Bays (${depot.fleetCount} Active Vans)</strong>
        </div>
        <div class="hover-address">${depot.address || ''}</div>
      </div>
    `, { direction: 'top', offset: [0, -14], opacity: 0.98 });

    markerGroup.addLayer(depotMarker);

    // 2. Customer Drop Points
    solution.routes.forEach((route, rIdx) => {
      const isRouteActive = selectedRouteIdx === null || selectedRouteIdx === rIdx;

      route.stops.forEach((stop, sIdx) => {
        const cust = stop.customer;
        const priorityColor = cust.priority === 'urgent' ? '#ef4444' : cust.priority === 'express' ? '#f59e0b' : '#3b82f6';

        const custIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div class="map-cust-pin ${isRunning ? 'is-running-ga' : ''}" style="border-color: #ffffff; background: ${priorityColor}; box-shadow: 0 0 10px ${route.vehicle.color}; opacity: ${isRouteActive ? 1.0 : 0.4};">
              <span>${sIdx + 1}</span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([cust.lat, cust.lng], { icon: custIcon });

        marker.bindTooltip(`
          <div class="map-hover-card">
            <div class="hover-card-header">
              <span class="hover-stop-pill" style="background: ${route.vehicle.color};">Stop #${sIdx + 1}</span>
              <span class="hover-punc-pill ${stop.isLate ? 'late' : 'ontime'}">
                ${stop.isLate ? `Late (+${stop.lateMinutes}m)` : 'On-Time'}
              </span>
            </div>
            <div class="hover-card-title">${cust.customerName}</div>
            <div class="hover-card-sub">${cust.name} (${cust.orderId})</div>
            
            <div class="hover-card-divider"></div>

            <div class="hover-detail-row">
              <span>Slot Window:</span>
              <strong>${formatMin(cust.timeWindowStart)} - ${formatMin(cust.timeWindowEnd)}</strong>
            </div>

            <div class="hover-detail-row">
              <span>Est. Arrival:</span>
              <strong style="color: ${stop.isLate ? '#ef4444' : '#10b981'};">${formatMin(stop.arrivalTimeMin)}</strong>
            </div>

            <div class="hover-detail-row">
              <span>Package Weight:</span>
              <strong>${cust.demandKg} kg (${cust.demandVolumeM3} m³)</strong>
            </div>

            <div class="hover-detail-row">
              <span>Assigned Van:</span>
              <strong style="color: ${route.vehicle.color};">${route.vehicle.name}</strong>
            </div>

            <div class="hover-address">${cust.address || ''}</div>
          </div>
        `, {
          direction: 'top',
          offset: [0, -12],
          opacity: 0.98,
          sticky: false
        });

        marker.on('mouseover', () => {
          setHoveredCustomer(cust);
          setHoveredRouteIdx(rIdx);
        });

        marker.on('mouseout', () => {
          setHoveredCustomer(null);
          setHoveredRouteIdx(null);
        });

        marker.on('click', () => {
          setSelectedCustomer(cust);
          setSelectedRouteIdx(rIdx);
        });

        markerGroup.addLayer(marker);
      });
    });
  }, [solution, depot, selectedRouteIdx, mapReady, isRunning]);

  // Handle Finish Plotting Points and Compute Optimized Route
  const handleFinishPlotting = () => {
    if (plottedPoints.length < 2) return;

    const newVehId = `veh-custom-${Date.now()}`;
    const newVehicle: Vehicle = {
      id: newVehId,
      name: newVehName,
      type: newVehType,
      maxCapacityKg: newVehPayload,
      maxVolumeM3: Number((newVehPayload / 120).toFixed(1)),
      avgSpeedKmh: newVehType === 'CARGO_EBIKE' ? 28 : newVehType === 'EV_VAN' ? 35 : 38,
      costPerKm: newVehType === 'CARGO_EBIKE' ? 3.0 : newVehType === 'EV_VAN' ? 4.5 : 12.0,
      co2GramsPerKm: newVehType === 'CARGO_EBIKE' ? 12 : newVehType === 'EV_VAN' ? 24 : 185,
      rangeKm: 200,
      color: newVehColor
    };

    // Construct customer objects from user's clicked points
    const newCustomers: Customer[] = plottedPoints.map((pt, idx) => {
      const dropPayload = Math.round(newVehPayload / (plottedPoints.length * 1.25));
      return {
        id: `c-custom-${Date.now()}-${idx + 1}`,
        name: `Custom Drop Location #${idx + 1}`,
        customerName: `Merchant Partner #${idx + 1}`,
        orderId: `ORD-CUST-${idx + 101}`,
        lat: pt[0],
        lng: pt[1],
        demandKg: Math.max(15, dropPayload),
        demandVolumeM3: Number((dropPayload / 150).toFixed(2)),
        timeWindowStart: 540 + idx * 30, // 9:00 AM onwards
        timeWindowEnd: 720 + idx * 30,   // 12:00 PM onwards
        serviceTimeMin: 10,
        priority: idx === 0 ? 'urgent' : idx % 2 === 0 ? 'express' : 'standard',
        address: `Custom Coordinate (${pt[0].toFixed(4)}, ${pt[1].toFixed(4)})`
      };
    });

    onAddCustomFleet(newVehicle, newCustomers);

    // Reset plotting state
    setIsPlottingMode(false);
    setPlottedPoints([]);
  };

  const handleCancelPlotting = () => {
    setIsPlottingMode(false);
    setPlottedPoints([]);
  };

  const handleUndoPoint = () => {
    setPlottedPoints(prev => prev.slice(0, -1));
  };

  return (
    <div className="map-tab-container">
      {/* Top Floating Control Bar */}
      <div className="map-control-bar">
        <div className="control-left-group">
          <button
            className={`control-btn play-toggle-btn ${isRunning ? 'running' : ''}`}
            onClick={onToggleRun}
          >
            {isRunning ? <Pause className="btn-icon" /> : <Play className="btn-icon" />}
            <span>{isRunning ? 'Pause' : 'Run GA'}</span>
          </button>

          <button
            className="control-btn step-btn"
            onClick={onStepGen}
            disabled={isRunning}
            title="Compute Next Single Generation"
          >
            <FastForward className="btn-icon" />
            <span>Step +1</span>
          </button>

          <button
            className="control-btn reset-btn"
            onClick={onReset}
            title="Reset Routes to Generation 1"
          >
            <RotateCcw className="btn-icon" />
            <span>Reset</span>
          </button>

          <button
            className="control-btn fit-view-btn"
            onClick={fitAllLocations}
            title="Recenter and fit all delivery drops & depot in view"
          >
            <Maximize2 className="btn-icon" />
            <span>Fit View</span>
          </button>

          {/* Speed Selector */}
          <div className="speed-control-wrapper">
            <span className="control-label">Speed:</span>
            {[
              { label: '1x', val: 300 },
              { label: '2x', val: 120 },
              { label: '5x', val: 40 },
              { label: 'Turbo', val: 5 }
            ].map(s => (
              <button
                key={s.label}
                className={`speed-pill ${speed === s.val ? 'active' : ''}`}
                onClick={() => setSpeed(s.val)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Base Map Layer Selector */}
          <div className="satellite-selector-group">
            <Globe className="w-3.5 h-3.5 text-cyan" />
            <button
              className={`layer-toggle-btn ${mapMode === 'dark' ? 'active' : ''}`}
              onClick={() => updateBaseTileLayer('dark')}
              title="CartoDB Dark Navigation Theme"
            >
              Dark Grid
            </button>
            <button
              className={`layer-toggle-btn ${mapMode === 'satellite' ? 'active' : ''}`}
              onClick={() => updateBaseTileLayer('satellite')}
              title="Esri High-Resolution Satellite"
            >
              High-Res Imagery
            </button>
            <button
              className={`layer-toggle-btn ${mapMode === 'sentinel' ? 'active' : ''}`}
              onClick={() => updateBaseTileLayer('sentinel')}
              title="Copernicus Sentinel-2 True Color Imagery"
            >
              Sentinel-2 Live
            </button>
            <button
              className={`layer-toggle-btn ${mapMode === 'streets' ? 'active' : ''}`}
              onClick={() => updateBaseTileLayer('streets')}
              title="OpenStreetMap Street Vectors"
            >
              Streets
            </button>
          </div>
        </div>

        {/* Live Metrics Ticker */}
        <div className="map-metrics-ticker">
          <div className="ticker-item">
            <span className="ticker-label">Generation</span>
            <span className="ticker-val highlight">{currentGen}</span>
          </div>

          <div className="ticker-item">
            <span className="ticker-label">Distance</span>
            <span className="ticker-val text-emerald">{solution.totalDistanceKm} km</span>
          </div>

          <div className="ticker-item">
            <span className="ticker-label">SLA Rate</span>
            <span className="ticker-val text-cyan">{solution.slaCompliancePct}%</span>
          </div>

          <div className="ticker-item">
            <span className="ticker-label">Active Fleet</span>
            <span className="ticker-val text-amber">{solution.routes.length} Vans</span>
          </div>

          <div className="ticker-item">
            <span className="ticker-label">Late Delay</span>
            <span className="ticker-val text-rose">
              {solution.totalLateMinutes > 0 ? `+${solution.totalLateMinutes}m` : '0m'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Banner when Plotting Points Mode is Active */}
      {isPlottingMode && (
        <div className="plotting-mode-banner">
          <div className="plotting-banner-info">
            <span className="pulse-dot"></span>
            <strong>Plotting Points for {newVehName} ({newVehPayload} kg):</strong>
            <span className="text-slate-300">Click anywhere on the map to add delivery drop points ({plottedPoints.length} added)</span>
          </div>

          <div className="plotting-banner-actions">
            <button
              onClick={handleUndoPoint}
              disabled={plottedPoints.length === 0}
              className="plot-action-btn undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              onClick={handleFinishPlotting}
              disabled={plottedPoints.length < 2}
              className="plot-action-btn finish"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Optimized Route ({plottedPoints.length} Drops)</span>
            </button>

            <button
              onClick={handleCancelPlotting}
              className="plot-action-btn cancel"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Map and Sidebar Layout */}
      <div className="map-view-wrapper">
        <div 
          ref={mapContainerRef} 
          className={`leaflet-map-canvas ${isPlottingMode ? 'crosshair-cursor' : ''}`}
        />

        {/* Real-time GA Optimization HUD Overlay with Best Route Effects */}
        {isRunning && (
          <div className="ga-optimizing-overlay-hud">
            <div className="hud-glow-pill">
              <span className="hud-radar-beacon"></span>
              <span className="hud-dna-icon">🧬</span>
              <div className="hud-info-stack">
                <div className="hud-title-row">
                  <span className="hud-status-badge">OPTIMIZING DISPATCH ROUTE</span>
                  <span className="hud-generation-badge">Gen #{currentGen}</span>
                </div>
                <div className="hud-stats-row">
                  <span>Best Distance: <strong className="text-emerald">{solution.totalDistanceKm} km</strong></span>
                  <span className="hud-sep">•</span>
                  <span>SLA: <strong className="text-cyan">{solution.slaCompliancePct}%</strong></span>
                  <span className="hud-sep">•</span>
                  <span>Active Fleets: <strong className="text-amber">{solution.routes.length} Vans</strong></span>
                </div>
              </div>
              <div className="hud-equalizer-bars">
                <span className="eq-bar eb1"></span>
                <span className="eq-bar eb2"></span>
                <span className="eq-bar eb3"></span>
                <span className="eq-bar eb4"></span>
                <span className="eq-bar eb5"></span>
              </div>
            </div>
          </div>
        )}

        {/* Route Details Overlay Sidebar */}
        <div className="map-sidebar-panel">
          <div className="sidebar-header">
            <div className="sidebar-title">
              <Truck className="title-icon" />
              <span>Fleet Dispatch ({solution.routes.length})</span>
            </div>

            <div className="flex items-center gap-2">
              {/* User Requested: Add Fleet Button */}
              <button
                className="add-fleet-trigger-btn"
                onClick={() => setShowAddFleetModal(true)}
                title="Add a new custom vehicle & plot points on map"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fleet</span>
              </button>

              {selectedRouteIdx !== null && (
                <button
                  className="show-all-routes-btn"
                  onClick={() => setSelectedRouteIdx(null)}
                >
                  All
                </button>
              )}
            </div>
          </div>

          {/* Route Cards List */}
          <div className="sidebar-routes-list">
            {solution.routes.map((route, idx) => {
              const isSelected = selectedRouteIdx === idx;
              const isHovered = hoveredRouteIdx === idx;
              return (
                <div
                  key={`${route.vehicle.id}-${idx}`}
                  className={`route-card-item ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => setSelectedRouteIdx(isSelected ? null : idx)}
                  onMouseEnter={() => setHoveredRouteIdx(idx)}
                  onMouseLeave={() => setHoveredRouteIdx(null)}
                >
                  <div className="route-card-top">
                    <div className="route-card-badge" style={{ backgroundColor: route.vehicle.color }}>
                      #{idx + 1}
                    </div>
                    <div className="route-vehicle-info">
                      <div className="route-veh-name">{route.vehicle.name}</div>
                      <div className="route-veh-type">{route.vehicle.type}</div>
                    </div>
                    <div className="route-dist-tag">{route.totalDistanceKm} km</div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="route-capacity-bar-box">
                    <div className="capacity-bar-labels">
                      <span>Payload: {route.totalLoadKg} / {route.vehicle.maxCapacityKg} kg</span>
                      <span className="font-semibold">{route.capacityUtilizationPct}%</span>
                    </div>
                    <div className="capacity-bar-track">
                      <div
                        className="capacity-bar-fill"
                        style={{
                          width: `${route.capacityUtilizationPct}%`,
                          backgroundColor: route.capacityUtilizationPct > 90 ? '#ef4444' : route.vehicle.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Route Quick Stats */}
                  <div className="route-stats-footer">
                    <span>{route.stops.length} Drops</span>
                    <span>₹{route.fuelCostInr} cost</span>
                    <span>{(route.co2EmissionsGrams / 1000).toFixed(1)} kg CO2</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Hover/Selected Location Inspector Card */}
          {(hoveredCustomer || selectedCustomer) && (
            <div className="customer-inspector-box">
              <div className="inspector-header">
                <Package className="inspector-icon" />
                <span className="inspector-title">
                  {hoveredCustomer ? 'Hovered Location Details' : 'Selected Drop Details'}
                </span>
              </div>

              {(() => {
                const target = hoveredCustomer || selectedCustomer!;
                return (
                  <>
                    <div className="inspector-row">
                      <span className="text-muted">Customer:</span>
                      <span className="font-bold text-white">{target.customerName}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="text-muted">Order ID:</span>
                      <span className="font-mono font-bold text-cyan">{target.orderId}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="text-muted">Destination:</span>
                      <span className="truncate">{target.name}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="text-muted">Delivery Slot:</span>
                      <span>{formatMin(target.timeWindowStart)} - {formatMin(target.timeWindowEnd)}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="text-muted">Package Weight:</span>
                      <span className="font-semibold text-emerald">{target.demandKg} kg</span>
                    </div>
                    <div className="inspector-row">
                      <span className="text-muted">Priority:</span>
                      <span className={`priority-tag ${target.priority}`}>
                        {target.priority.toUpperCase()}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* User Requested: Modal to Configure Vehicle & Payload */}
      {showAddFleetModal && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-dialog">
            <div className="custom-modal-header">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald" />
                <h3 className="custom-modal-title">Add Fleet Vehicle & Dispatch Points</h3>
              </div>
              <button
                className="modal-close-icon-btn"
                onClick={() => setShowAddFleetModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="custom-modal-body">
              {/* Vehicle Name */}
              <div className="modal-form-group">
                <label className="modal-form-label">Vehicle Name / Label</label>
                <input
                  type="text"
                  className="modal-form-input"
                  value={newVehName}
                  onChange={(e) => setNewVehName(e.target.value)}
                  placeholder="e.g. Tata Ace Express EV #5"
                />
              </div>

              {/* Vehicle Type */}
              <div className="modal-form-group">
                <label className="modal-form-label">Vehicle Type</label>
                <div className="modal-type-chips">
                  {[
                    { id: 'EV_VAN', label: '🌱 EV Van (Green)' },
                    { id: 'ICE_TRUCK', label: '🚚 Cargo Truck (Heavy)' },
                    { id: 'CARGO_EBIKE', label: '⚡ Cargo E-Bike (Express)' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`type-chip ${newVehType === t.id ? 'active' : ''}`}
                      onClick={() => setNewVehType(t.id as any)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payload Capacity */}
              <div className="modal-form-group">
                <div className="flex justify-between items-center mb-1">
                  <label className="modal-form-label">Maximum Payload Capacity (kg)</label>
                  <span className="text-emerald font-bold font-mono">{newVehPayload} kg</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="2000"
                  step="50"
                  value={newVehPayload}
                  onChange={(e) => setNewVehPayload(Number(e.target.value))}
                  className="custom-range-slider"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>150 kg (Bike)</span>
                  <span>750 kg (Van)</span>
                  <span>2000 kg (Truck)</span>
                </div>
              </div>

              {/* Route Theme Color */}
              <div className="modal-form-group">
                <label className="modal-form-label">Route Display Color</label>
                <div className="flex gap-2">
                  {['#a855f7', '#ec4899', '#f97316', '#14b8a6', '#3b82f6', '#eab308'].map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`color-pick-circle ${newVehColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewVehColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-info-callout">
                <MapPin className="w-4 h-4 text-cyan flex-shrink-0" />
                <span className="text-xs text-slate-300">
                  After clicking continue, click on the map to plot custom delivery points for this vehicle. The Genetic Algorithm will then trace and optimize the real road route.
                </span>
              </div>
            </div>

            <div className="custom-modal-footer">
              <button
                className="modal-btn-secondary"
                onClick={() => setShowAddFleetModal(false)}
              >
                Cancel
              </button>

              <button
                className="modal-btn-primary"
                onClick={() => {
                  setShowAddFleetModal(false);
                  setIsPlottingMode(true);
                  setPlottedPoints([]);
                }}
              >
                <MapPin className="w-4 h-4" />
                <span>Next: Plot Points on Map →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
