import React, { useState } from 'react';
import { Solution, CityPreset, Vehicle, DisruptionEvent } from '../../types/logistics';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  TrendingDown, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  Flame, 
  Navigation
} from 'lucide-react';

interface DynamicDisruptionsTabProps {
  selectedCity: CityPreset;
  vehicles: Vehicle[];
  solution: Solution;
  onApplyDisruption: (type: 'TRAFFIC_JAM' | 'VEHICLE_BREAKDOWN' | 'URGENT_ORDER' | 'ROAD_CLOSURE') => void;
  onClearDisruptions: () => void;
  activeDisruption: DisruptionEvent | null;
  trafficMultiplier: number;
  disruptedVehicleId?: string;
}

export const DynamicDisruptionsTab: React.FC<DynamicDisruptionsTabProps> = ({
  selectedCity,
  vehicles,
  solution,
  onApplyDisruption,
  onClearDisruptions,
  activeDisruption,
  trafficMultiplier,
  disruptedVehicleId
}) => {
  return (
    <div className="tab-page-container">
      {/* Header */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">Real-Time Dynamic Disruption & Warm-Start Re-Routing</h2>
          <p className="tab-page-desc">
            Simulate real-world supply chain chaos in Indian traffic corridors. Watch how warm-start Genetic Algorithm dynamically rebalances loads and recalculates surviving routes on-the-fly.
          </p>
        </div>

        {activeDisruption && (
          <button className="clear-disruption-btn" onClick={onClearDisruptions}>
            <RotateCcw className="btn-icon" />
            <span>Clear Disruption & Restore Normal Ops</span>
          </button>
        )}
      </div>

      {/* Active Alert Banner */}
      {activeDisruption ? (
        <div className="active-disruption-banner">
          <div className="flex items-center gap-3">
            <div className="banner-pulse-icon">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="banner-title">{activeDisruption.title}</div>
              <div className="banner-desc">{activeDisruption.description}</div>
            </div>
          </div>

          <div className="banner-meta">
            <span className="banner-tag">Dynamic GA Re-Optimization Triggered</span>
          </div>
        </div>
      ) : (
        <div className="nominal-ops-banner">
          <CheckCircle2 className="w-5 h-5 text-emerald" />
          <span>Nominal Logistics Status: All corridors flowing smoothly with 0 active disruptions.</span>
        </div>
      )}

      {/* Disruption Injector Cards */}
      <div className="disruption-injector-section">
        <h3 className="section-subtitle-heading">Select a Real-World Disruption Event to Inject:</h3>

        <div className="disruption-cards-grid">
          {/* Disruption 1: Traffic Jam */}
          <div 
            className={`disruption-card ${activeDisruption?.type === 'TRAFFIC_JAM' ? 'active' : ''}`}
            onClick={() => onApplyDisruption('TRAFFIC_JAM')}
          >
            <div className="disruption-icon-box bg-amber">
              <AlertTriangle className="disruption-icon" />
            </div>
            <div className="disruption-card-body">
              <h4 className="disruption-card-title">Severe Corridor Traffic Gridlock</h4>
              <p className="disruption-card-desc">
                Simulates major rush-hour congestion along primary expressway corridors (2.2x travel time latency).
              </p>
              <div className="disruption-action-row">
                <span className="disruption-impact text-amber">Impact: +120% Transit Latency</span>
                <span className="inject-cta">Inject Event →</span>
              </div>
            </div>
          </div>

          {/* Disruption 2: Vehicle Breakdown */}
          <div 
            className={`disruption-card ${activeDisruption?.type === 'VEHICLE_BREAKDOWN' ? 'active' : ''}`}
            onClick={() => onApplyDisruption('VEHICLE_BREAKDOWN')}
          >
            <div className="disruption-icon-box bg-rose">
              <Truck className="disruption-icon" />
            </div>
            <div className="disruption-card-body">
              <h4 className="disruption-card-title">Delivery Van Mechanical Failure</h4>
              <p className="disruption-card-desc">
                Tata Ace EV Van (Fleet #1) breaks down mid-route. Parcels must be absorbed immediately by remaining fleet.
              </p>
              <div className="disruption-action-row">
                <span className="disruption-impact text-rose">Impact: Fleet Count -1 (Emergency Rebalance)</span>
                <span className="inject-cta">Inject Event →</span>
              </div>
            </div>
          </div>

          {/* Disruption 3: Urgent Express Order */}
          <div 
            className={`disruption-card ${activeDisruption?.type === 'URGENT_ORDER' ? 'active' : ''}`}
            onClick={() => onApplyDisruption('URGENT_ORDER')}
          >
            <div className="disruption-icon-box bg-cyan">
              <Zap className="disruption-icon" />
            </div>
            <div className="disruption-card-body">
              <h4 className="disruption-card-title">High-Priority Express Order Injection</h4>
              <p className="disruption-card-desc">
                VIP Same-Day emergency medicine order arrives with a tight 30-minute delivery time window.
              </p>
              <div className="disruption-action-row">
                <span className="disruption-impact text-cyan">Impact: Dynamic Customer Insertion</span>
                <span className="inject-cta">Inject Event →</span>
              </div>
            </div>
          </div>

          {/* Disruption 4: Monsoon Road Flooding */}
          <div 
            className={`disruption-card ${activeDisruption?.type === 'ROAD_CLOSURE' ? 'active' : ''}`}
            onClick={() => onApplyDisruption('ROAD_CLOSURE')}
          >
            <div className="disruption-icon-box bg-purple">
              <Navigation className="disruption-icon" />
            </div>
            <div className="disruption-card-body">
              <h4 className="disruption-card-title">Monsoon Underpass Waterlogging</h4>
              <p className="disruption-card-desc">
                Key arterial highway is closed due to waterlogging, forcing long detours and rerouting.
              </p>
              <div className="disruption-action-row">
                <span className="disruption-impact text-purple">Impact: Detour Routing & Time Penalty</span>
                <span className="inject-cta">Inject Event →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Warm-Start Analytics Comparison */}
      <div className="warmstart-analytics-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Zap className="card-title-icon text-emerald" />
            <span className="card-title-text">How Warm-Start Genetic Algorithm Solves Real-Time Disruptions</span>
          </div>
        </div>

        <div className="warmstart-steps-grid">
          <div className="step-card">
            <div className="step-badge">1. STATE CAPTURE</div>
            <h5 className="step-title">Lock Completed Drops</h5>
            <p className="step-desc">
              Customer deliveries already completed prior to the disruption timestamp are frozen in tabu memory.
            </p>
          </div>

          <div className="step-card">
            <div className="step-badge">2. SEED POPULATION</div>
            <h5 className="step-title">Warm-Start Re-Seeding</h5>
            <p className="step-desc">
              Instead of generating a random population, the current active chromosome is injected into generation 0.
            </p>
          </div>

          <div className="step-card">
            <div className="step-badge">3. HYPER-MUTATION</div>
            <h5 className="step-title">Targeted 2-Opt Repair</h5>
            <p className="step-desc">
              Mutation rate increases temporarily to 45% for 15 generations to rapidly untangle severed links.
            </p>
          </div>

          <div className="step-card">
            <div className="step-badge">4. DISPATCH SYNCHRONIZATION</div>
            <h5 className="step-title">Seamless Turn-By-Turn Update</h5>
            <p className="step-desc">
              Drivers receive dynamic turn-by-turn re-routing instructions on mobile terminals without depot return.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
