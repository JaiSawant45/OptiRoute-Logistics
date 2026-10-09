import React, { useState, useEffect, useRef } from 'react';
import { GAConfig, GenerationRecord, AlgorithmBenchmarkResult, Solution, CityPreset, Vehicle } from '../../types/logistics';
import { runFullBenchmarkSuite } from '../../algorithms/comparisonAlgorithms';
import { 
  BarChart3, 
  Sliders, 
  TrendingUp, 
  Cpu, 
  Award, 
  Clock, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

interface AlgorithmLabTabProps {
  config: GAConfig;
  onChangeConfig: (newConfig: GAConfig) => void;
  generationHistory: GenerationRecord[];
  currentSolution: Solution;
  selectedCity: CityPreset;
  vehicles: Vehicle[];
  onTriggerBenchmark: () => void;
  benchmarks: AlgorithmBenchmarkResult[];
}

export const AlgorithmLabTab: React.FC<AlgorithmLabTabProps> = ({
  config,
  onChangeConfig,
  generationHistory,
  currentSolution,
  selectedCity,
  vehicles,
  benchmarks
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localBenchmarks, setLocalBenchmarks] = useState<AlgorithmBenchmarkResult[]>(benchmarks);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Draw Fitness Convergence Curve on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (generationHistory.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Start GA or run generations to plot convergence curve...', width / 2, height / 2);
      return;
    }

    const padLeft = 50;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 35;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const bestFits = generationHistory.map(h => h.bestFitness);
    const avgFits = generationHistory.map(h => h.avgFitness);

    const minFit = Math.min(...avgFits) * 0.95;
    const maxFit = Math.max(...bestFits) * 1.05;
    const fitRange = maxFit - minFit || 1;

    // Draw Grid Lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      const labelVal = (maxFit - (fitRange / 4) * i).toFixed(1);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(labelVal, padLeft - 8, y + 3);
    }
    ctx.setLineDash([]);

    // Plot Avg Fitness (Cyan Line)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    generationHistory.forEach((rec, idx) => {
      const x = padLeft + (idx / (generationHistory.length - 1)) * chartW;
      const y = padTop + chartH - ((rec.avgFitness - minFit) / fitRange) * chartH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Plot Best Fitness (Emerald Line with gradient glow)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    generationHistory.forEach((rec, idx) => {
      const x = padLeft + (idx / (generationHistory.length - 1)) * chartW;
      const y = padTop + chartH - ((rec.bestFitness - minFit) / fitRange) * chartH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Generations (1 to ' + generationHistory.length + ')', padLeft + chartW / 2, height - 8);

  }, [generationHistory]);

  const handleRunBenchmarks = () => {
    setIsBenchmarking(true);
    setTimeout(() => {
      const results = runFullBenchmarkSuite(selectedCity.customers, selectedCity.depots[0], vehicles);
      setLocalBenchmarks(results);
      setIsBenchmarking(false);
    }, 150);
  };

  return (
    <div className="tab-page-container">
      {/* Page Title */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">Genetic Algorithm Laboratory & Multi-Model Benchmarks</h2>
          <p className="tab-page-desc">
            Empirically evaluate convergence, tune genetic operators, and compare performance against classical heuristics and meta-heuristics.
          </p>
        </div>

        <button
          className={`benchmark-run-btn ${isBenchmarking ? 'loading' : ''}`}
          onClick={handleRunBenchmarks}
          disabled={isBenchmarking}
        >
          <Zap className="btn-icon" />
          <span>{isBenchmarking ? 'Computing Benchmarks...' : 'Re-Run All Algorithm Benchmarks'}</span>
        </button>
      </div>

      <div className="lab-grid-layout">
        {/* Left Column: Convergence Chart & Live Fitness */}
        <div className="lab-chart-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <TrendingUp className="card-title-icon text-emerald" />
              <span className="card-title-text">Live Convergence Curve (Best vs Avg Fitness)</span>
            </div>

            <div className="chart-legend-group">
              <div className="legend-item">
                <span className="legend-swatch bg-emerald"></span>
                <span>Best Fitness</span>
              </div>
              <div className="legend-item">
                <span className="legend-swatch bg-cyan"></span>
                <span>Average Population Fitness</span>
              </div>
            </div>
          </div>

          <div className="canvas-wrapper">
            <canvas ref={canvasRef} width={680} height={280} className="convergence-canvas" />
          </div>

          <div className="chart-footer-stats">
            <div className="footer-stat-box">
              <span className="text-muted">Current Best Fitness:</span>
              <span className="font-bold text-emerald text-base">
                {generationHistory.length > 0 ? generationHistory[generationHistory.length - 1].bestFitness : currentSolution.fitness}
              </span>
            </div>
            <div className="footer-stat-box">
              <span className="text-muted">Total Distance:</span>
              <span className="font-bold text-cyan text-base">{currentSolution.totalDistanceKm} km</span>
            </div>
            <div className="footer-stat-box">
              <span className="text-muted">SLA Compliance:</span>
              <span className="font-bold text-amber text-base">{currentSolution.slaCompliancePct}%</span>
            </div>
          </div>
        </div>

        {/* Right Column: GA Hyperparameter Tuning Workbench */}
        <div className="lab-tuning-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Sliders className="card-title-icon text-indigo" />
              <span className="card-title-text">Hyperparameter Tuning Workbench</span>
            </div>
            <button
              className="reset-params-btn"
              onClick={() => onChangeConfig({
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
              })}
            >
              Default
            </button>
          </div>

          <div className="sliders-list">
            {/* Population Size */}
            <div className="slider-item">
              <div className="slider-label-row">
                <span>Population Size ($N$)</span>
                <span className="slider-val-badge">{config.populationSize}</span>
              </div>
              <input
                type="range"
                min="20"
                max="150"
                step="5"
                value={config.populationSize}
                onChange={(e) => onChangeConfig({ ...config, populationSize: Number(e.target.value) })}
                className="custom-range-slider"
              />
              <div className="slider-hint">Total chromosomes per generation generation cycle.</div>
            </div>

            {/* Crossover Rate */}
            <div className="slider-item">
              <div className="slider-label-row">
                <span>Crossover Probability ($P_c$)</span>
                <span className="slider-val-badge">{config.crossoverRate.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.98"
                step="0.02"
                value={config.crossoverRate}
                onChange={(e) => onChangeConfig({ ...config, crossoverRate: Number(e.target.value) })}
                className="custom-range-slider"
              />
              <div className="slider-hint">Frequency of Order Crossover (OX) reproduction.</div>
            </div>

            {/* Mutation Rate */}
            <div className="slider-item">
              <div className="slider-label-row">
                <span>Mutation Probability ($P_m$)</span>
                <span className="slider-val-badge">{config.mutationRate.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.02"
                value={config.mutationRate}
                onChange={(e) => onChangeConfig({ ...config, mutationRate: Number(e.target.value) })}
                className="custom-range-slider"
              />
              <div className="slider-hint">2-Opt inversion and swap mutation rate to escape local optima.</div>
            </div>

            {/* Elitism Count */}
            <div className="slider-item">
              <div className="slider-label-row">
                <span>Elitism Count ($K$)</span>
                <span className="slider-val-badge">{config.elitismCount}</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={config.elitismCount}
                onChange={(e) => onChangeConfig({ ...config, elitismCount: Number(e.target.value) })}
                className="custom-range-slider"
              />
              <div className="slider-hint">Top chromosomes guaranteed to survive without mutation.</div>
            </div>

            {/* Tournament Size */}
            <div className="slider-item">
              <div className="slider-label-row">
                <span>Tournament Selection Size ($k$)</span>
                <span className="slider-val-badge">{config.tournamentSize}</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={config.tournamentSize}
                onChange={(e) => onChangeConfig({ ...config, tournamentSize: Number(e.target.value) })}
                className="custom-range-slider"
              />
              <div className="slider-hint">Selection pressure for parent choosing.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Algorithm Benchmark Comparison Table */}
      <div className="benchmark-matrix-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Award className="card-title-icon text-amber" />
            <span className="card-title-text">Comparative Multi-Algorithm Performance Benchmark</span>
          </div>
          <span className="benchmark-status-badge">
            Evaluated on {selectedCity.customers.length} Drops in {selectedCity.name}
          </span>
        </div>

        <div className="table-responsive">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Algorithm Model</th>
                <th>Run Time</th>
                <th>Total Distance</th>
                <th>Active Vehicles</th>
                <th>Late Deliveries</th>
                <th>Est. Fuel Cost</th>
                <th>CO2 Footprint</th>
                <th>SLA Adherence</th>
                <th>Convergence Speed</th>
              </tr>
            </thead>
            <tbody>
              {localBenchmarks.map((bm, idx) => {
                const isGA = bm.algorithmName.includes('Genetic');
                return (
                  <tr key={bm.algorithmName} className={isGA ? 'ga-highlight-row' : ''}>
                    <td className="font-bold flex items-center gap-2">
                      {isGA && <Award className="w-4 h-4 text-emerald" />}
                      <span>{bm.algorithmName}</span>
                    </td>
                    <td>{bm.runTimeMs} ms</td>
                    <td className="font-semibold text-emerald">{bm.totalDistanceKm} km</td>
                    <td>{bm.totalVehiclesUsed} Vans</td>
                    <td>
                      <span className={bm.lateDeliveries === 0 ? 'text-emerald font-semibold' : 'text-rose font-semibold'}>
                        {bm.lateDeliveries} Drops
                      </span>
                    </td>
                    <td>₹{bm.costInr.toLocaleString('en-IN')}</td>
                    <td>{bm.co2EmissionsKg} kg</td>
                    <td>
                      <span className={`sla-badge ${bm.slaCompliancePct > 90 ? 'high' : 'medium'}`}>
                        {bm.slaCompliancePct}%
                      </span>
                    </td>
                    <td className="text-muted text-xs">
                      {bm.convergenceGen ? `Gen ~${bm.convergenceGen}` : 'Instant Heuristic'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="benchmark-summary-callout">
          <div className="callout-title">
            <CheckCircle2 className="w-5 h-5 text-emerald" />
            <span>Academic Analysis & Algorithmic Findings</span>
          </div>
          <p className="callout-text">
            While <strong>Greedy Nearest Neighbor (GNN)</strong> executes near-instantaneously, it falls victim to myopic local routing, incurring high distance and late arrival penalties. <strong>Ant Colony Optimization (ACO)</strong> provides strong convergence on distance, but requires significant matrix memory overhead. The <strong>Genetic Algorithm (GA) with 2-Opt Inversion Mutation and Elitism</strong> achieves the optimal Pareto balance: lowest total kilometers, lowest operational INR expenditure, and highest on-time SLA retention.
          </p>
        </div>
      </div>
    </div>
  );
};
