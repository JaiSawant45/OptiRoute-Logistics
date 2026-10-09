import React from 'react';
import { INDIAN_CITY_PRESETS } from '../data/indianCities';
import type { CityPreset } from '../types/logistics';
import { 
  Truck, 
  MapPin, 
  BarChart3, 
  ShieldAlert, 
  FileDown, 
  Layers, 
  Play, 
  Pause, 
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'landing' | 'map' | 'lab' | 'fleet' | 'disruptions';
  setActiveTab: (tab: 'landing' | 'map' | 'lab' | 'fleet' | 'disruptions') => void;
  selectedCity: CityPreset;
  onSelectCity: (city: CityPreset) => void;
  onExportPDF: () => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  currentGen: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedCity,
  onSelectCity,
  onExportPDF,
  isRunning,
  onToggleRun,
  onReset,
  currentGen
}) => {
  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Professional Enterprise Brand Logo */}
        <div className="navbar-brand" onClick={() => setActiveTab('landing')}>
          <div className="brand-logo-wrapper">
            <div className="brand-icon-box">
              <Truck className="brand-icon-truck" />
            </div>
          </div>
          <div className="brand-text-block">
            <div className="brand-title">
              OptiRoute <span className="brand-badge-clean">Logistics Platform</span>
            </div>
            <div className="brand-subtitle">
              Genetic Algorithm Dispatch & Multi-Vehicle Route Planning
            </div>
          </div>
        </div>

        {/* City Selector */}
        <div className="navbar-city-selector">
          <MapPin className="city-icon" />
          <select
            className="city-select-dropdown"
            value={selectedCity.id}
            onChange={(e) => {
              const found = INDIAN_CITY_PRESETS.find(c => c.id === e.target.value);
              if (found) onSelectCity(found);
            }}
          >
            {INDIAN_CITY_PRESETS.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} ({city.customers.length} Drops)
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs-group">
          <button
            className={`nav-tab-btn ${activeTab === 'landing' ? 'active' : ''}`}
            onClick={() => setActiveTab('landing')}
          >
            <Layers className="tab-icon" />
            <span>Overview</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <MapPin className="tab-icon" />
            <span>Route Map</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
            onClick={() => setActiveTab('lab')}
          >
            <BarChart3 className="tab-icon" />
            <span>Algorithm Lab</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
            onClick={() => setActiveTab('fleet')}
          >
            <Truck className="tab-icon" />
            <span>Fleet Operations</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'disruptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('disruptions')}
          >
            <ShieldAlert className="tab-icon" />
            <span>Dynamic Chaos</span>
          </button>
        </nav>

        {/* Global Action Buttons */}
        <div className="navbar-actions">
          {/* Simulation Toggle in Navbar */}
          <div className="simulation-quick-controls">
            <button
              className={`sim-play-btn ${isRunning ? 'running' : ''}`}
              onClick={onToggleRun}
              title={isRunning ? 'Pause Optimization' : 'Start GA Optimization'}
            >
              {isRunning ? <Pause className="btn-icon" /> : <Play className="btn-icon" />}
              <span>{isRunning ? 'Pause' : 'Run GA'}</span>
            </button>

            <button
              className="sim-reset-btn"
              onClick={onReset}
              title="Reset Simulation to Initial State"
            >
              <RefreshCw className="btn-icon" />
            </button>

            <div className="gen-pill">
              Gen: <span className="gen-num">{currentGen}</span>
            </div>
          </div>

          {/* Export PDF Button */}
          <button
            className="export-pdf-btn"
            onClick={onExportPDF}
            title="Download Academic & Business PDF Project Report"
          >
            <FileDown className="btn-icon" />
            <span>Export Report PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};
