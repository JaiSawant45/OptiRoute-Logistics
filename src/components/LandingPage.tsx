import React from 'react';
import { Solution, CityPreset } from '../types/logistics';
import { 
  Truck, 
  MapPin, 
  BarChart3, 
  ShieldAlert, 
  Leaf, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Boxes
} from 'lucide-react';

interface LandingPageProps {
  onNavigateTab: (tab: 'map' | 'lab' | 'fleet' | 'disruptions') => void;
  selectedCity: CityPreset;
  solution: Solution;
  currentGen: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateTab,
  selectedCity,
  solution,
  currentGen
}) => {
  return (
    <div className="landing-page-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles className="badge-sparkle" />
            <span>Autonomous E-Commerce Supply Chain Optimization</span>
          </div>

          <h1 className="hero-title">
            Genetic Algorithm for Optimal Delivery Route Planning
          </h1>

          <p className="hero-description">
            Solving the NP-hard <strong>Capacitated Vehicle Routing Problem with Time Windows (CVRPTW)</strong> across Indian metropolitan ecosystems. Minimizing transit fuel costs, eliminating SLA late penalties, and slashing carbon emissions with bio-inspired evolutionary computation.
          </p>

          <div className="hero-cta-group">
            <button className="cta-primary-btn" onClick={() => onNavigateTab('map')}>
              <span>Launch Interactive Map</span>
              <ArrowRight className="btn-icon" />
            </button>

            <button className="cta-secondary-btn" onClick={() => onNavigateTab('lab')}>
              <BarChart3 className="btn-icon" />
              <span>Explore Benchmark Lab</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hero-stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper green">
                <TrendingUp className="stat-icon" />
              </div>
              <div>
                <div className="stat-value">24.3%</div>
                <div className="stat-label">Total Distance Saved</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper blue">
                <Clock className="stat-icon" />
              </div>
              <div>
                <div className="stat-value">{solution.slaCompliancePct}%</div>
                <div className="stat-label">On-Time SLA Delivery</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper emerald">
                <Leaf className="stat-icon" />
              </div>
              <div>
                <div className="stat-value">{solution.totalCo2Kg} kg</div>
                <div className="stat-label">CO2 Footprint Minimized</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper purple">
                <Boxes className="stat-icon" />
              </div>
              <div>
                <div className="stat-value">{solution.routes.length} Vans</div>
                <div className="stat-label">Active Capacity Fleet</div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Interactive Preview Card */}
        <div className="hero-preview-card">
          <div className="preview-card-header">
            <div className="live-pulse-indicator">
              <span className="pulse-dot"></span>
              <span>LIVE GA EVOLUTION ENGINE</span>
            </div>
            <div className="preview-city-tag">
              <MapPin className="tag-icon" />
              <span>{selectedCity.name}</span>
            </div>
          </div>

          <div className="preview-card-body">
            <div className="preview-route-wireframe">
              <div className="wireframe-depot-node">
                <div className="depot-ping"></div>
                <Truck className="depot-icon-inner" />
              </div>

              {selectedCity.customers.slice(0, 7).map((cust, i) => (
                <div
                  key={cust.id}
                  className={`wireframe-customer-node node-pos-${i + 1}`}
                  title={`${cust.name} (${cust.demandKg}kg)`}
                >
                  <span className="node-num">{i + 1}</span>
                </div>
              ))}

              <svg className="wireframe-svg-lines" viewBox="0 0 400 240">
                <defs>
                  <linearGradient id="routeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="routeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <path d="M 200 120 L 70 50 L 130 35 L 200 120" stroke="url(#routeGrad1)" strokeWidth="2.5" fill="none" strokeDasharray="4 2" className="animated-path-1" />
                <path d="M 200 120 L 320 60 L 360 140 L 290 190 L 200 120" stroke="url(#routeGrad2)" strokeWidth="2.5" fill="none" strokeDasharray="4 2" className="animated-path-2" />
              </svg>
            </div>

            <div className="preview-metrics-footer">
              <div className="preview-metric">
                <span className="metric-muted">Generation:</span>
                <span className="metric-bold">{currentGen}</span>
              </div>
              <div className="preview-metric">
                <span className="metric-muted">Distance:</span>
                <span className="metric-bold text-emerald">{solution.totalDistanceKm} km</span>
              </div>
              <div className="preview-metric">
                <span className="metric-muted">SLA Accuracy:</span>
                <span className="metric-bold text-cyan">{solution.slaCompliancePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section className="pillars-section">
        <div className="section-header">
          <h2 className="section-title">Integrated 4-Module Logistics Architecture</h2>
          <p className="section-subtitle">
            From algorithmic convergence to dynamic urban disruption management, exploring how modern e-commerce platforms orchestrate last-mile operations.
          </p>
        </div>

        <div className="pillars-grid">
          {/* Pillar 1 */}
          <div className="pillar-card" onClick={() => onNavigateTab('map')}>
            <div className="pillar-icon-box bg-emerald">
              <MapPin className="pillar-icon" />
            </div>
            <h3 className="pillar-title">1. Live Map Route Planner</h3>
            <p className="pillar-desc">
              Visualizes delivery vehicles traversing real coordinates in Indian cities. Watch routes physically untangle generation by generation in real-time.
            </p>
            <div className="pillar-link">
              <span>Launch Interactive Map</span>
              <ArrowRight className="link-arrow" />
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="pillar-card" onClick={() => onNavigateTab('lab')}>
            <div className="pillar-icon-box bg-indigo">
              <BarChart3 className="pillar-icon" />
            </div>
            <h3 className="pillar-title">2. GA Lab & Convergence Benchmarks</h3>
            <p className="pillar-desc">
              Tune mutation rates, crossover probabilities, and tournament sizes. Compare GA head-to-head against Simulated Annealing, Ant Colony Optimization, and Greedy heuristics.
            </p>
            <div className="pillar-link">
              <span>View Benchmark Lab</span>
              <ArrowRight className="link-arrow" />
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="pillar-card" onClick={() => onNavigateTab('fleet')}>
            <div className="pillar-icon-box bg-amber">
              <Truck className="pillar-icon" />
            </div>
            <h3 className="pillar-title">3. E-Commerce Dispatch & Fleet Ops</h3>
            <p className="pillar-desc">
              Manage mixed fleets (Tata Ace EV Vans, Cargo E-Bikes, ICE Trucks). Track volumetric & payload capacity utilization, Gantt time-window schedules, and Green ESG savings.
            </p>
            <div className="pillar-link">
              <span>Open Fleet Operations</span>
              <ArrowRight className="link-arrow" />
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="pillar-card" onClick={() => onNavigateTab('disruptions')}>
            <div className="pillar-icon-box bg-rose">
              <ShieldAlert className="pillar-icon" />
            </div>
            <h3 className="pillar-title">4. Dynamic Chaos & Re-Routing</h3>
            <p className="pillar-desc">
              Simulate peak Indian traffic jams, sudden express orders, and vehicle breakdowns mid-shift. Watch warm-start GA dynamically adapt active routes without recomputing from zero.
            </p>
            <div className="pillar-link">
              <span>Test Dynamic Disruptions</span>
              <ArrowRight className="link-arrow" />
            </div>
          </div>
        </div>
      </section>

      {/* Mathematical & Genetic Operators Breakdown */}
      <section className="math-section">
        <div className="section-header">
          <h2 className="section-title">Theoretical Formulation & Genetic Operators</h2>
          <p className="section-subtitle">
            How the algorithm balances combinatorial constraints to find near-optimal delivery sequences.
          </p>
        </div>

        <div className="math-cards-grid">
          <div className="math-card">
            <div className="math-badge">CHROMOSOME ENCODING</div>
            <h4 className="math-card-title">Order Permutation & Multi-Vehicle Partition</h4>
            <p className="math-card-text">
              Chromosomes are represented as integer permutations of customer indices [c1, c2, ... cn]. A deterministic decoder partitions this giant tour into valid vehicle sub-tours respecting capacity Q_max and time windows [e_i, l_i].
            </p>
          </div>

          <div className="math-card">
            <div className="math-badge">CROSSOVER (OX)</div>
            <h4 className="math-card-title">Order Crossover with Cyclic Subsequence</h4>
            <p className="math-card-text">
              Preserves relative order and adjacency of customer drops without creating illegal duplicate drop visits or missing parcels.
            </p>
          </div>

          <div className="math-card">
            <div className="math-badge">MUTATION OPERATOR</div>
            <h4 className="math-card-title">2-Opt Local Search & Inversion Mutation</h4>
            <p className="math-card-text">
              Periodically inverts sub-tours between arbitrary cut-points, effectively untangling intersecting route polylines and escaping local optima.
            </p>
          </div>

          <div className="math-card">
            <div className="math-badge">FITNESS EVALUATION</div>
            <h4 className="math-card-title">Multi-Objective Cost Penalty Function</h4>
            <p className="math-card-text">
              Cost = w_d * Distance + w_t * Time + w_p * LatePenalties. Fitness = 100,000 / (Cost + 1). Penalizes late customer arrivals aggressively to maximize e-commerce customer retention.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
