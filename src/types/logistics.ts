export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface Customer extends Location {
  demandKg: number;
  demandVolumeM3: number;
  timeWindowStart: number; // minutes from 00:00 (e.g. 540 = 9:00 AM)
  timeWindowEnd: number;   // minutes from 00:00 (e.g. 660 = 11:00 AM)
  serviceTimeMin: number;
  priority: 'standard' | 'express' | 'urgent';
  orderId: string;
  customerName: string;
}

export interface Depot extends Location {
  vehicleCapacity: number;
  fleetCount: number;
  hubName: string;
}

export interface Vehicle {
  id: string;
  name: string;
  type: 'EV_VAN' | 'ICE_TRUCK' | 'CARGO_EBIKE';
  maxCapacityKg: number;
  maxVolumeM3: number;
  avgSpeedKmh: number;
  costPerKm: number; // in INR
  co2GramsPerKm: number;
  rangeKm: number;
  color: string;
}

export interface RouteStop {
  customer: Customer;
  arrivalTimeMin: number;
  departureTimeMin: number;
  isLate: boolean;
  lateMinutes: number;
  accumulatedDistanceKm: number;
  accumulatedLoadKg: number;
}

export interface VehicleRoute {
  vehicle: Vehicle;
  depot: Depot;
  stops: RouteStop[];
  totalDistanceKm: number;
  totalTimeMin: number;
  totalLoadKg: number;
  capacityUtilizationPct: number;
  latePenaltyCost: number;
  fuelCostInr: number;
  co2EmissionsGrams: number;
}

export interface Solution {
  routes: VehicleRoute[];
  totalDistanceKm: number;
  totalTimeMin: number;
  fitness: number;
  unassignedCustomers: Customer[];
  totalLateMinutes: number;
  totalCostInr: number;
  totalCo2Kg: number;
  slaCompliancePct: number;
}

export interface GAConfig {
  populationSize: number;
  crossoverRate: number;
  mutationRate: number;
  elitismCount: number;
  maxGenerations: number;
  tournamentSize: number;
  distanceWeight: number;
  timeWeight: number;
  latePenaltyWeight: number;
  vehicleCostWeight: number;
}

export interface GenerationRecord {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  bestDistanceKm: number;
  totalLateMinutes: number;
  activeVehicles: number;
}

export interface AlgorithmBenchmarkResult {
  algorithmName: string;
  runTimeMs: number;
  totalDistanceKm: number;
  totalVehiclesUsed: number;
  lateDeliveries: number;
  costInr: number;
  co2EmissionsKg: number;
  slaCompliancePct: number;
  convergenceGen?: number;
}

export interface DisruptionEvent {
  id: string;
  type: 'TRAFFIC_JAM' | 'VEHICLE_BREAKDOWN' | 'URGENT_ORDER' | 'ROAD_CLOSURE';
  title: string;
  description: string;
  affectedVehicleId?: string;
  affectedLocationId?: string;
  delayFactorMultiplier?: number;
  active: boolean;
}

export interface CityPreset {
  id: string;
  name: string;
  state: string;
  center: [number, number];
  zoom: number;
  depots: Depot[];
  customers: Customer[];
}
