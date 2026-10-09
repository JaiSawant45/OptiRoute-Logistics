import React from 'react';
import { Solution, Vehicle } from '../../types/logistics';
import { 
  Truck, 
  Zap, 
  Leaf, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  Fuel
} from 'lucide-react';

interface FleetOperationsTabProps {
  solution: Solution;
  vehicles: Vehicle[];
  cityName: string;
}

export const FleetOperationsTab: React.FC<FleetOperationsTabProps> = ({
  solution,
  vehicles,
  cityName
}) => {
  const totalStops = solution.routes.reduce((acc, r) => acc + r.stops.length, 0);
  const lateStops = solution.routes.reduce((acc, r) => acc + r.stops.filter(s => s.isLate).length, 0);
  const totalPayloadDelivered = solution.routes.reduce((acc, r) => acc + r.totalLoadKg, 0);

  // ESG Savings against an all-diesel fleet baseline
  const baselineDieselCo2Grams = solution.totalDistanceKm * 210;
  const actualCo2Grams = solution.routes.reduce((acc, r) => acc + r.co2EmissionsGrams, 0);
  const co2SavedKg = Math.max(0, (baselineDieselCo2Grams - actualCo2Grams) / 1000);

  const formatMin = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h % 12 || 12}:${min < 10 ? '0' : ''}${min} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="tab-page-container">
      {/* Header */}
      <div className="tab-page-header">
        <div>
          <h2 className="tab-page-title">E-Commerce Fleet Dispatch & Green Logistics Hub</h2>
          <p className="tab-page-desc">
            Monitor real-time payload capacities, Gantt time-window manifests, fuel expenditures, and Carbon ESG metrics for {cityName}.
          </p>
        </div>
      </div>

      {/* Top 4 Impact KPI Cards */}
      <div className="fleet-kpi-grid">
        <div className="fleet-kpi-card">
          <div className="kpi-icon-box bg-emerald">
            <Leaf className="kpi-icon" />
          </div>
          <div>
            <div className="kpi-value">{co2SavedKg.toFixed(1)} kg</div>
            <div className="kpi-label">CO2 Prevented vs Diesel Baseline</div>
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div className="kpi-icon-box bg-cyan">
            <Zap className="kpi-icon" />
          </div>
          <div>
            <div className="kpi-value">
              {solution.routes.filter(r => r.vehicle.type === 'EV_VAN' || r.vehicle.type === 'CARGO_EBIKE').length} / {solution.routes.length}
            </div>
            <div className="kpi-label">Green EV / E-Bike Fleet Ratio</div>
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div className="kpi-icon-box bg-indigo">
            <DollarSign className="kpi-icon" />
          </div>
          <div>
            <div className="kpi-value">₹{solution.totalCostInr.toLocaleString('en-IN')}</div>
            <div className="kpi-label">Total Dispatch Fuel & SLA Cost</div>
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div className="kpi-icon-box bg-purple">
            <Truck className="kpi-icon" />
          </div>
          <div>
            <div className="kpi-value">{totalPayloadDelivered.toFixed(0)} kg</div>
            <div className="kpi-label">Total E-Commerce Payload Moved</div>
          </div>
        </div>
      </div>

      {/* Vehicle Dispatch Cards */}
      <div className="fleet-cards-section">
        <h3 className="section-subtitle-heading">Active Dispatched Fleet Capacity & Metrics</h3>
        <div className="fleet-vehicle-grid">
          {solution.routes.map((route, idx) => {
            const isEV = route.vehicle.type === 'EV_VAN' || route.vehicle.type === 'CARGO_EBIKE';
            return (
              <div key={`${route.vehicle.id}-${idx}`} className="vehicle-detail-card">
                <div className="veh-card-header">
                  <div className="flex items-center gap-3">
                    <div className="veh-type-badge" style={{ backgroundColor: route.vehicle.color }}>
                      {route.vehicle.type.replace('_', ' ')}
                    </div>
                    <div>
                      <div className="veh-name font-bold text-slate-100">{route.vehicle.name}</div>
                      <div className="text-xs text-slate-400">ID: {route.vehicle.id}</div>
                    </div>
                  </div>

                  {isEV && (
                    <div className="ev-badge">
                      <Zap className="w-3.5 h-3.5 text-emerald" />
                      <span>Zero Tailpipe EV</span>
                    </div>
                  )}
                </div>

                {/* Capacity Gauge */}
                <div className="veh-capacity-meter-box">
                  <div className="capacity-meta-row">
                    <span className="text-xs text-slate-300">Payload Weight</span>
                    <span className="text-xs font-bold text-slate-200">
                      {route.totalLoadKg} / {route.vehicle.maxCapacityKg} kg ({route.capacityUtilizationPct}%)
                    </span>
                  </div>
                  <div className="capacity-track">
                    <div
                      className="capacity-fill"
                      style={{
                        width: `${route.capacityUtilizationPct}%`,
                        backgroundColor: route.vehicle.color
                      }}
                    />
                  </div>
                </div>

                {/* Route Metrics Grid */}
                <div className="veh-stats-grid">
                  <div className="veh-stat">
                    <span className="text-xs text-slate-400">Drops Assigned</span>
                    <span className="font-bold text-slate-100">{route.stops.length} stops</span>
                  </div>

                  <div className="veh-stat">
                    <span className="text-xs text-slate-400">Route Distance</span>
                    <span className="font-bold text-emerald">{route.totalDistanceKm} km</span>
                  </div>

                  <div className="veh-stat">
                    <span className="text-xs text-slate-400">Fuel Expenditure</span>
                    <span className="font-bold text-slate-100">₹{route.fuelCostInr}</span>
                  </div>

                  <div className="veh-stat">
                    <span className="text-xs text-slate-400">CO2 Emissions</span>
                    <span className="font-bold text-slate-100">{(route.co2EmissionsGrams / 1000).toFixed(2)} kg</span>
                  </div>
                </div>

                {/* Stops Timeline Mini Bar */}
                <div className="veh-stops-summary">
                  <div className="stops-timeline-header">
                    <span>Delivery Stops Itinerary:</span>
                    <span>{route.stops.filter(s => s.isLate).length} Late Warnings</span>
                  </div>
                  <div className="stops-pills-row">
                    {route.stops.map((stop, sIdx) => (
                      <span
                        key={stop.customer.id}
                        className={`stop-mini-pill ${stop.isLate ? 'late' : 'ontime'}`}
                        title={`${stop.customer.customerName} - ${formatMin(stop.arrivalTimeMin)}`}
                      >
                        #{sIdx + 1}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gantt Schedule & Time Window Timeline */}
      <div className="gantt-manifest-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Clock className="card-title-icon text-cyan" />
            <span className="card-title-text">Master Delivery Schedule & Time-Window Manifest</span>
          </div>
          <span className="text-xs text-slate-400">Shift Window: 08:00 AM - 06:00 PM</span>
        </div>

        <div className="table-responsive">
          <table className="manifest-table">
            <thead>
              <tr>
                <th>Vehicle & Route</th>
                <th>Stop #</th>
                <th>Recipient / Store</th>
                <th>Order Number</th>
                <th>Payload</th>
                <th>Customer Window</th>
                <th>Est. Arrival</th>
                <th>Punctuality Status</th>
              </tr>
            </thead>
            <tbody>
              {solution.routes.flatMap((route, rIdx) =>
                route.stops.map((stop, sIdx) => (
                  <tr key={`${route.vehicle.id}-${stop.customer.id}`}>
                    <td className="font-medium text-slate-200">
                      <span className="route-inline-dot" style={{ backgroundColor: route.vehicle.color }} />
                      {route.vehicle.name}
                    </td>
                    <td>Stop #{sIdx + 1}</td>
                    <td className="font-medium">{stop.customer.customerName}</td>
                    <td className="font-mono text-xs text-slate-300">{stop.customer.orderId}</td>
                    <td>{stop.customer.demandKg} kg</td>
                    <td className="text-slate-300 text-xs">
                      {formatMin(stop.customer.timeWindowStart)} - {formatMin(stop.customer.timeWindowEnd)}
                    </td>
                    <td className="font-semibold text-slate-100">{formatMin(stop.arrivalTimeMin)}</td>
                    <td>
                      {stop.isLate ? (
                        <span className="status-badge-late">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Late (+{stop.lateMinutes}m)
                        </span>
                      ) : (
                        <span className="status-badge-ontime">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          On-Time
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
