import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INDIAN_CITY_PRESETS, DEFAULT_VEHICLES } from './data/indianCities';
import type { CityPreset, GAConfig, GenerationRecord, Solution, DisruptionEvent, Customer, Vehicle } from './types/logistics';
import { GeneticAlgorithmSolver, decodeChromosomeToRoutes } from './algorithms/geneticAlgorithm';
import { runFullBenchmarkSuite } from './algorithms/comparisonAlgorithms';
import { exportProjectReportPDF } from './utils/pdfExport';
import confetti from 'canvas-confetti';

import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { RoutePlannerMapTab } from './components/tabs/RoutePlannerMapTab';
import { AlgorithmLabTab } from './components/tabs/AlgorithmLabTab';
import { FleetOperationsTab } from './components/tabs/FleetOperationsTab';
import { DynamicDisruptionsTab } from './components/tabs/DynamicDisruptionsTab';

export function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'map' | 'lab' | 'fleet' | 'disruptions'>('landing');
  const [selectedCity, setSelectedCity] = useState<CityPreset>(INDIAN_CITY_PRESETS[0]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEFAULT_VEHICLES);

  const [gaConfig, setGaConfig] = useState<GAConfig>({
    populationSize: 50,
    crossoverRate: 0.85,
    mutationRate: 0.20,
    elitismCount: 3,
    maxGenerations: 100,
    tournamentSize: 4,
    distanceWeight: 1.0,
    timeWeight: 0.8,
    latePenaltyWeight: 15,
    vehicleCostWeight: 10,
  });

  const [currentGen, setCurrentGen] = useState(1);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(120);

  // Dynamic disruptions state
  const [activeDisruption, setActiveDisruption] = useState<DisruptionEvent | null>(null);
  const [trafficMultiplier, setTrafficMultiplier] = useState(1.0);
  const [disruptedVehicleId, setDisruptedVehicleId] = useState<string | undefined>(undefined);

  // Active GA solver instance
  const solverRef = useRef<GeneticAlgorithmSolver | null>(null);

  // Current best solution
  const [currentSolution, setCurrentSolution] = useState<Solution>(() => {
    const initChromo = [...Array(selectedCity.customers.length).keys()];
    return decodeChromosomeToRoutes(initChromo, selectedCity.customers, selectedCity.depots[0], DEFAULT_VEHICLES);
  });

  // Benchmarks cache
  const [benchmarks, setBenchmarks] = useState(() =>
    runFullBenchmarkSuite(selectedCity.customers, selectedCity.depots[0], DEFAULT_VEHICLES)
  );

  // Initialize or reset GA Solver
  const initSolver = useCallback(() => {
    const solver = new GeneticAlgorithmSolver(
      selectedCity.customers,
      selectedCity.depots[0],
      vehicles,
      gaConfig,
      trafficMultiplier,
      disruptedVehicleId
    );
    solverRef.current = solver;

    const initialSolution = solver.getBestSolution();
    setCurrentSolution(initialSolution);
    setCurrentGen(1);

    const firstRecord: GenerationRecord = {
      generation: 1,
      bestFitness: initialSolution.fitness,
      avgFitness: initialSolution.fitness,
      bestDistanceKm: initialSolution.totalDistanceKm,
      totalLateMinutes: initialSolution.totalLateMinutes,
      activeVehicles: initialSolution.routes.length,
    };
    setGenerationHistory([firstRecord]);
  }, [selectedCity, vehicles, gaConfig, trafficMultiplier, disruptedVehicleId]);

  // Re-init when city or disruptions or vehicles change
  useEffect(() => {
    initSolver();
    setBenchmarks(runFullBenchmarkSuite(selectedCity.customers, selectedCity.depots[0], vehicles, trafficMultiplier));
  }, [selectedCity, vehicles, initSolver]);

  // Handler for adding custom fleet vehicle & plotted customer drop points
  const handleAddCustomFleet = (newVehicle: Vehicle, newCustomers: Customer[]) => {
    const updatedVehicles = [...vehicles, newVehicle];
    const updatedCity: CityPreset = {
      ...selectedCity,
      customers: [...selectedCity.customers, ...newCustomers]
    };

    setVehicles(updatedVehicles);
    setSelectedCity(updatedCity);

    // Trigger instant GA optimization on newly plotted points
    setTimeout(() => {
      setIsRunning(true);
    }, 200);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Step 1 Generation
  const stepOneGeneration = useCallback(() => {
    if (!solverRef.current) return;

    setCurrentGen(prevGen => {
      const nextGen = prevGen + 1;
      const { bestSolution, record } = solverRef.current!.stepGeneration(nextGen);
      setCurrentSolution(bestSolution);
      setGenerationHistory(prev => [...prev.slice(-150), record]);

      // Trigger confetti celebration on high milestones
      if (nextGen === 50 || nextGen === 100) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      }

      return nextGen;
    });
  }, []);

  // Simulation timer loop
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      stepOneGeneration();
    }, speed);

    return () => clearInterval(timer);
  }, [isRunning, speed, stepOneGeneration]);

  // Disruption Handlers
  const handleApplyDisruption = (type: 'TRAFFIC_JAM' | 'VEHICLE_BREAKDOWN' | 'URGENT_ORDER' | 'ROAD_CLOSURE') => {
    let title = '';
    let description = '';
    let mult = 1.0;
    let brokenVehId: string | undefined = undefined;

    if (type === 'TRAFFIC_JAM') {
      title = 'Severe Expressway Congestion Alert';
      description = 'Traffic bottlenecks along major metro flyovers increased transit delays by 2.2x.';
      mult = 2.2;
    } else if (type === 'VEHICLE_BREAKDOWN') {
      title = 'Fleet Breakdown: Tata Ace EV #1 Disabled';
      description = 'Battery / motor malfunction reported. Remaining parcels must be absorbed by other active vans.';
      brokenVehId = 'veh-ev-1';
    } else if (type === 'URGENT_ORDER') {
      title = 'Flash Same-Day Medicine Express Order Inserted';
      description = 'Emergency 30-minute delivery time window injected into schedule.';
      mult = 1.15;
    } else if (type === 'ROAD_CLOSURE') {
      title = 'Monsoon Waterlogging & Arterial Road Closed';
      description = 'Underpass flooded; forcing reroute and extra perimeter distance.';
      mult = 1.6;
    }

    const event: DisruptionEvent = {
      id: `disrupt-${Date.now()}`,
      type,
      title,
      description,
      delayFactorMultiplier: mult,
      affectedVehicleId: brokenVehId,
      active: true
    };

    setActiveDisruption(event);
    setTrafficMultiplier(mult);
    setDisruptedVehicleId(brokenVehId);

    // Warm-start GA re-routing: Boost mutation rate temporarily to untangle
    setGaConfig(prev => ({
      ...prev,
      mutationRate: 0.40,
    }));
  };

  const handleClearDisruptions = () => {
    setActiveDisruption(null);
    setTrafficMultiplier(1.0);
    setDisruptedVehicleId(undefined);
    setGaConfig(prev => ({
      ...prev,
      mutationRate: 0.20,
    }));
  };

  const handleExportPDF = () => {
    exportProjectReportPDF(selectedCity, currentSolution, benchmarks, gaConfig);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 }
    });
  };

  return (
    <div className="app-root-layout">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
          setIsRunning(false);
        }}
        onExportPDF={handleExportPDF}
        isRunning={isRunning}
        onToggleRun={() => setIsRunning(!isRunning)}
        onReset={() => {
          setIsRunning(false);
          initSolver();
        }}
        currentGen={currentGen}
      />

      {/* Main View Area */}
      <main className={`app-main-content ${activeTab === 'map' ? 'map-active' : 'scrollable-tab'}`}>
        {activeTab === 'landing' && (
          <LandingPage
            onNavigateTab={setActiveTab}
            selectedCity={selectedCity}
            solution={currentSolution}
            currentGen={currentGen}
          />
        )}

        {activeTab === 'map' && (
          <RoutePlannerMapTab
            depot={selectedCity.depots[0]}
            customers={selectedCity.customers}
            solution={currentSolution}
            currentGen={currentGen}
            isRunning={isRunning}
            onToggleRun={() => setIsRunning(!isRunning)}
            onReset={() => {
              setIsRunning(false);
              initSolver();
            }}
            onStepGen={stepOneGeneration}
            speed={speed}
            setSpeed={setSpeed}
            activeCityName={selectedCity.name}
            onAddCustomFleet={handleAddCustomFleet}
          />
        )}

        {activeTab === 'lab' && (
          <AlgorithmLabTab
            config={gaConfig}
            onChangeConfig={(newCfg) => {
              setGaConfig(newCfg);
              initSolver();
            }}
            generationHistory={generationHistory}
            currentSolution={currentSolution}
            selectedCity={selectedCity}
            vehicles={vehicles}
            onTriggerBenchmark={() => {
              const res = runFullBenchmarkSuite(selectedCity.customers, selectedCity.depots[0], vehicles, trafficMultiplier);
              setBenchmarks(res);
            }}
            benchmarks={benchmarks}
          />
        )}

        {activeTab === 'fleet' && (
          <FleetOperationsTab
            solution={currentSolution}
            vehicles={vehicles}
            cityName={selectedCity.name}
          />
        )}

        {activeTab === 'disruptions' && (
          <DynamicDisruptionsTab
            selectedCity={selectedCity}
            vehicles={vehicles}
            solution={currentSolution}
            onApplyDisruption={handleApplyDisruption}
            onClearDisruptions={handleClearDisruptions}
            activeDisruption={activeDisruption}
            trafficMultiplier={trafficMultiplier}
            disruptedVehicleId={disruptedVehicleId}
          />
        )}
      </main>
    </div>
  );
}

export default App;
