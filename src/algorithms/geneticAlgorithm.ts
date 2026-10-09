import { Customer, Depot, Vehicle, Solution, VehicleRoute, RouteStop, GAConfig, GenerationRecord } from '../types/logistics';

// Haversine distance in kilometers
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1.25; // 1.25 urban winding factor to simulate actual road turns
}

export function decodeChromosomeToRoutes(
  chromosome: number[],
  customers: Customer[],
  depot: Depot,
  vehicles: Vehicle[],
  trafficMultiplier: number = 1.0,
  disruptedVehicleId?: string
): Solution {
  const routes: VehicleRoute[] = [];
  let vehicleIdx = 0;
  let currentStops: RouteStop[] = [];
  let currentLoadKg = 0;
  let currentVolumeM3 = 0;
  let currentDistanceKm = 0;
  let currentTimeMin = 480; // Starts at 8:00 AM (480 min)
  let currentLat = depot.lat;
  let currentLng = depot.lng;
  let currentLatePenalty = 0;
  let totalLateMinutes = 0;

  // Filter out any broken vehicle if disruption is active
  const availableVehicles = vehicles.filter(v => v.id !== disruptedVehicleId);
  const activeVehiclesList = availableVehicles.length > 0 ? availableVehicles : vehicles;

  let currentVehicle = activeVehiclesList[vehicleIdx % activeVehiclesList.length];

  const unassigned: Customer[] = [];

  for (let i = 0; i < chromosome.length; i++) {
    const custIdx = chromosome[i];
    const customer = customers[custIdx];
    if (!customer) continue;

    const distToCustomer = haversineDistanceKm(currentLat, currentLng, customer.lat, customer.lng);
    const travelTimeMin = (distToCustomer / currentVehicle.avgSpeedKmh) * 60 * trafficMultiplier;
    const estArrivalTime = currentTimeMin + travelTimeMin;

    const wouldExceedWeight = currentLoadKg + customer.demandKg > currentVehicle.maxCapacityKg;
    const wouldExceedVolume = currentVolumeM3 + customer.demandVolumeM3 > currentVehicle.maxVolumeM3;
    const wouldExceedDay = estArrivalTime + customer.serviceTimeMin > 1080; // 6:00 PM (18:00)

    // Split into new vehicle route if capacity or shift time exceeded
    if ((wouldExceedWeight || wouldExceedVolume || wouldExceedDay) && currentStops.length > 0) {
      // Close current vehicle route by returning to depot
      const returnDist = haversineDistanceKm(currentLat, currentLng, depot.lat, depot.lng);
      const returnTravelTime = (returnDist / currentVehicle.avgSpeedKmh) * 60 * trafficMultiplier;
      currentDistanceKm += returnDist;
      currentTimeMin += returnTravelTime;

      const fuelCost = currentDistanceKm * currentVehicle.costPerKm;
      const co2Grams = currentDistanceKm * currentVehicle.co2GramsPerKm;

      routes.push({
        vehicle: currentVehicle,
        depot,
        stops: [...currentStops],
        totalDistanceKm: Number(currentDistanceKm.toFixed(2)),
        totalTimeMin: Math.round(currentTimeMin - 480),
        totalLoadKg: Number(currentLoadKg.toFixed(1)),
        capacityUtilizationPct: Math.min(100, Math.round((currentLoadKg / currentVehicle.maxCapacityKg) * 100)),
        latePenaltyCost: Math.round(currentLatePenalty),
        fuelCostInr: Math.round(fuelCost),
        co2EmissionsGrams: Math.round(co2Grams),
      });

      // Reset for next vehicle
      vehicleIdx++;
      currentVehicle = activeVehiclesList[vehicleIdx % activeVehiclesList.length];
      currentStops = [];
      currentLoadKg = 0;
      currentVolumeM3 = 0;
      currentDistanceKm = 0;
      currentTimeMin = 480;
      currentLat = depot.lat;
      currentLng = depot.lng;
      currentLatePenalty = 0;
    }

    // Assign customer to current vehicle
    const legDist = haversineDistanceKm(currentLat, currentLng, customer.lat, customer.lng);
    const legTime = (legDist / currentVehicle.avgSpeedKmh) * 60 * trafficMultiplier;
    
    // Arrival and early arrival wait handling
    let arrivalTime = currentTimeMin + legTime;
    if (arrivalTime < customer.timeWindowStart) {
      // Vehicle waits until customer window opens
      arrivalTime = customer.timeWindowStart;
    }

    const isLate = arrivalTime > customer.timeWindowEnd;
    const lateMins = isLate ? arrivalTime - customer.timeWindowEnd : 0;
    if (isLate) {
      totalLateMinutes += lateMins;
      currentLatePenalty += lateMins * 15; // 15 INR penalty per late minute
    }

    const departureTime = arrivalTime + customer.serviceTimeMin;

    currentDistanceKm += legDist;
    currentTimeMin = departureTime;
    currentLoadKg += customer.demandKg;
    currentVolumeM3 += customer.demandVolumeM3;
    currentLat = customer.lat;
    currentLng = customer.lng;

    currentStops.push({
      customer,
      arrivalTimeMin: Math.round(arrivalTime),
      departureTimeMin: Math.round(departureTime),
      isLate,
      lateMinutes: Math.round(lateMins),
      accumulatedDistanceKm: Number(currentDistanceKm.toFixed(2)),
      accumulatedLoadKg: Number(currentLoadKg.toFixed(1))
    });
  }

  // Close final route
  if (currentStops.length > 0) {
    const returnDist = haversineDistanceKm(currentLat, currentLng, depot.lat, depot.lng);
    const returnTravelTime = (returnDist / currentVehicle.avgSpeedKmh) * 60 * trafficMultiplier;
    currentDistanceKm += returnDist;
    currentTimeMin += returnTravelTime;

    const fuelCost = currentDistanceKm * currentVehicle.costPerKm;
    const co2Grams = currentDistanceKm * currentVehicle.co2GramsPerKm;

    routes.push({
      vehicle: currentVehicle,
      depot,
      stops: [...currentStops],
      totalDistanceKm: Number(currentDistanceKm.toFixed(2)),
      totalTimeMin: Math.round(currentTimeMin - 480),
      totalLoadKg: Number(currentLoadKg.toFixed(1)),
      capacityUtilizationPct: Math.min(100, Math.round((currentLoadKg / currentVehicle.maxCapacityKg) * 100)),
      latePenaltyCost: Math.round(currentLatePenalty),
      fuelCostInr: Math.round(fuelCost),
      co2EmissionsGrams: Math.round(co2Grams),
    });
  }

  const grandTotalDist = routes.reduce((sum, r) => sum + r.totalDistanceKm, 0);
  const grandTotalTime = routes.reduce((sum, r) => sum + r.totalTimeMin, 0);
  const grandTotalCost = routes.reduce((sum, r) => sum + r.fuelCostInr + r.latePenaltyCost, 0);
  const grandTotalCo2Kg = routes.reduce((sum, r) => sum + r.co2EmissionsGrams, 0) / 1000;

  const totalDelivered = routes.reduce((sum, r) => sum + r.stops.length, 0);
  const lateStopsCount = routes.reduce((sum, r) => sum + r.stops.filter(s => s.isLate).length, 0);
  const slaCompliancePct = totalDelivered > 0 ? Math.round(((totalDelivered - lateStopsCount) / totalDelivered) * 100) : 100;

  // Fitness calculation: higher fitness = better solution
  const distPenalty = grandTotalDist * 1.5;
  const timePenalty = grandTotalTime * 0.8;
  const latePenalty = totalLateMinutes * 25;
  const unassignedPenalty = unassigned.length * 10000;
  const vehicleCountPenalty = routes.length * 50;

  const costScore = distPenalty + timePenalty + latePenalty + unassignedPenalty + vehicleCountPenalty;
  const fitness = Number((100000 / (costScore + 1)).toFixed(4));

  return {
    routes,
    totalDistanceKm: Number(grandTotalDist.toFixed(2)),
    totalTimeMin: grandTotalTime,
    fitness,
    unassignedCustomers: unassigned,
    totalLateMinutes: Math.round(totalLateMinutes),
    totalCostInr: Math.round(grandTotalCost),
    totalCo2Kg: Number(grandTotalCo2Kg.toFixed(2)),
    slaCompliancePct
  };
}

export class GeneticAlgorithmSolver {
  private customers: Customer[];
  private depot: Depot;
  private vehicles: Vehicle[];
  private config: GAConfig;
  private population: number[][] = [];
  private trafficMultiplier: number = 1.0;
  private disruptedVehicleId?: string;

  constructor(
    customers: Customer[],
    depot: Depot,
    vehicles: Vehicle[],
    config: GAConfig,
    trafficMultiplier: number = 1.0,
    disruptedVehicleId?: string
  ) {
    this.customers = customers;
    this.depot = depot;
    this.vehicles = vehicles;
    this.config = config;
    this.trafficMultiplier = trafficMultiplier;
    this.disruptedVehicleId = disruptedVehicleId;
    this.initializePopulation();
  }

  private initializePopulation() {
    this.population = [];
    const n = this.customers.length;
    if (n === 0) return;

    // Seed 1: Nearest neighbor heuristic solution for faster convergence
    const seedNeighbor = this.getGreedyNeighborChromosome();
    this.population.push(seedNeighbor);

    // Seed 2: Time window sorted chromosome
    const seedTimeWindow = [...Array(n).keys()].sort((a, b) => 
      this.customers[a].timeWindowEnd - this.customers[b].timeWindowEnd
    );
    this.population.push(seedTimeWindow);

    // Remainder: Random permutations with diverse shuffle
    for (let i = 2; i < this.config.populationSize; i++) {
      const chromo = [...Array(n).keys()];
      for (let j = n - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [chromo[j], chromo[k]] = [chromo[k], chromo[j]];
      }
      this.population.push(chromo);
    }
  }

  private getGreedyNeighborChromosome(): number[] {
    const n = this.customers.length;
    const visited = new Set<number>();
    const chromosome: number[] = [];

    let currentLat = this.depot.lat;
    let currentLng = this.depot.lng;

    while (visited.size < n) {
      let nearestIdx = -1;
      let minDist = Infinity;

      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          const d = haversineDistanceKm(currentLat, currentLng, this.customers[i].lat, this.customers[i].lng);
          if (d < minDist) {
            minDist = d;
            nearestIdx = i;
          }
        }
      }

      if (nearestIdx !== -1) {
        visited.add(nearestIdx);
        chromosome.push(nearestIdx);
        currentLat = this.customers[nearestIdx].lat;
        currentLng = this.customers[nearestIdx].lng;
      } else {
        break;
      }
    }
    return chromosome;
  }

  // Tournament selection
  private selectParent(fitnesses: number[]): number[] {
    let bestIdx = Math.floor(Math.random() * this.population.length);
    let bestFit = fitnesses[bestIdx];

    for (let i = 1; i < this.config.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      if (fitnesses[idx] > bestFit) {
        bestFit = fitnesses[idx];
        bestIdx = idx;
      }
    }
    return [...this.population[bestIdx]];
  }

  // Order Crossover (OX) - avoids duplicate customer visits
  private orderCrossover(parent1: number[], parent2: number[]): [number[], number[]] {
    if (Math.random() > this.config.crossoverRate || parent1.length < 3) {
      return [[...parent1], [...parent2]];
    }

    const n = parent1.length;
    const pt1 = Math.floor(Math.random() * (n - 1));
    const pt2 = pt1 + 1 + Math.floor(Math.random() * (n - pt1 - 1));

    const child1 = Array(n).fill(-1);
    const child2 = Array(n).fill(-1);

    // Copy segment
    const set1 = new Set<number>();
    const set2 = new Set<number>();
    for (let i = pt1; i <= pt2; i++) {
      child1[i] = parent1[i];
      set1.add(parent1[i]);

      child2[i] = parent2[i];
      set2.add(parent2[i]);
    }

    // Fill remaining elements in cyclic order
    let c1Idx = (pt2 + 1) % n;
    for (let i = 0; i < n; i++) {
      const candidate = parent2[(pt2 + 1 + i) % n];
      if (!set1.has(candidate)) {
        child1[c1Idx] = candidate;
        c1Idx = (c1Idx + 1) % n;
      }
    }

    let c2Idx = (pt2 + 1) % n;
    for (let i = 0; i < n; i++) {
      const candidate = parent1[(pt2 + 1 + i) % n];
      if (!set2.has(candidate)) {
        child2[c2Idx] = candidate;
        c2Idx = (c2Idx + 1) % n;
      }
    }

    return [child1, child2];
  }

  // 2-Opt and Swap Mutation
  private mutate(chromosome: number[]) {
    if (Math.random() > this.config.mutationRate || chromosome.length < 3) return;

    const n = chromosome.length;
    const mutationType = Math.random();

    if (mutationType < 0.6) {
      // 2-Opt Inversion Mutation (Untangles intersecting route loops)
      const i = Math.floor(Math.random() * (n - 1));
      const j = i + 1 + Math.floor(Math.random() * (n - i - 1));
      let left = i;
      let right = j;
      while (left < right) {
        [chromosome[left], chromosome[right]] = [chromosome[right], chromosome[left]];
        left++;
        right--;
      }
    } else {
      // Swap Mutation
      const i = Math.floor(Math.random() * n);
      const j = Math.floor(Math.random() * n);
      [chromosome[i], chromosome[j]] = [chromosome[j], chromosome[i]];
    }
  }

  // Run single generation step
  public stepGeneration(genNumber: number): { bestSolution: Solution; record: GenerationRecord } {
    const fitnesses = this.population.map(ch => {
      const sol = decodeChromosomeToRoutes(
        ch,
        this.customers,
        this.depot,
        this.vehicles,
        this.trafficMultiplier,
        this.disruptedVehicleId
      );
      return sol.fitness;
    });

    // Find best
    let bestIdx = 0;
    let maxFit = fitnesses[0];
    let sumFit = 0;

    for (let i = 0; i < fitnesses.length; i++) {
      sumFit += fitnesses[i];
      if (fitnesses[i] > maxFit) {
        maxFit = fitnesses[i];
        bestIdx = i;
      }
    }

    const bestChromosome = this.population[bestIdx];
    const bestSolution = decodeChromosomeToRoutes(
      bestChromosome,
      this.customers,
      this.depot,
      this.vehicles,
      this.trafficMultiplier,
      this.disruptedVehicleId
    );

    const record: GenerationRecord = {
      generation: genNumber,
      bestFitness: maxFit,
      avgFitness: Number((sumFit / fitnesses.length).toFixed(4)),
      bestDistanceKm: bestSolution.totalDistanceKm,
      totalLateMinutes: bestSolution.totalLateMinutes,
      activeVehicles: bestSolution.routes.length,
    };

    // Sort indices for elitism
    const sortedIndices = [...Array(this.population.length).keys()].sort(
      (a, b) => fitnesses[b] - fitnesses[a]
    );

    const nextPopulation: number[][] = [];

    // Elitism: Preserve the top K chromosomes
    for (let e = 0; e < Math.min(this.config.elitismCount, this.population.length); e++) {
      nextPopulation.push([...this.population[sortedIndices[e]]]);
    }

    // Reproduce remainder
    while (nextPopulation.length < this.config.populationSize) {
      const parent1 = this.selectParent(fitnesses);
      const parent2 = this.selectParent(fitnesses);

      const [child1, child2] = this.orderCrossover(parent1, parent2);
      this.mutate(child1);
      this.mutate(child2);

      nextPopulation.push(child1);
      if (nextPopulation.length < this.config.populationSize) {
        nextPopulation.push(child2);
      }
    }

    this.population = nextPopulation;

    return { bestSolution, record };
  }

  public getBestSolution(): Solution {
    let bestSol: Solution | null = null;
    for (const ch of this.population) {
      const sol = decodeChromosomeToRoutes(
        ch,
        this.customers,
        this.depot,
        this.vehicles,
        this.trafficMultiplier,
        this.disruptedVehicleId
      );
      if (!bestSol || sol.fitness > bestSol.fitness) {
        bestSol = sol;
      }
    }
    return bestSol!;
  }
}
