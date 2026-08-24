import React from 'react';
import type { SiteMode } from '../types';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="td-toggle-row">
      <div className="td-toggle-info">
        <span className="td-toggle-label">{label}</span>
        {description && <span className="td-toggle-desc">{description}</span>}
      </div>
      <button
        type="button"
        className={`td-toggle ${checked ? 'td-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        aria-label={label}
      >
        <span className="td-toggle-knob" />
      </button>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, unit = '', onChange }: SliderProps) {
  return (
    <div className="td-slider">
      <div className="td-slider-header">
        <span className="td-slider-label">{label}</span>
        <span className="td-slider-value">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

interface ModeSelectorProps {
  value: SiteMode;
  onChange: (mode: SiteMode) => void;
}

const MODES: { value: SiteMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'soft', label: 'Soft' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="td-mode-selector">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          className={`td-mode-btn ${value === mode.value ? 'td-mode-btn--active' : ''}`}
          onClick={() => onChange(mode.value)}
          aria-pressed={value === mode.value}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <section className="td-section">
      <h2 className="td-section-title">{title}</h2>
      {children}
    </section>
  );
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className="td-collapsible">
      <button
        type="button"
        className="td-collapsible-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="td-collapsible-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="td-collapsible-body">{children}</div>}
    </section>
  );
}
