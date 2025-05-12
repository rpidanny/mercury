import React from 'react';

interface ToolbarControlProps {
  name: string;
  activeControl: string | null;
  toggleControl: (name: string) => void;
  isChanging?: boolean;
  title: string;
  disabled: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const ToolbarControl: React.FC<ToolbarControlProps> = ({
  name,
  activeControl,
  toggleControl,
  isChanging,
  title,
  disabled,
  icon,
  children
}) => {
  const isActive = activeControl === name;
  
  // Map control names to their animation classes
  const animationClassMap: Record<string, string> = {
    width: 'scaling',
    altitude: 'elevating',
    rotation: 'rotating'
  };
  
  const changingClass = isChanging ? `is-${animationClassMap[name] || ''}` : '';

  return (
    <div className={`toolbar-control ${isActive ? 'active' : ''}`}>
      <button
        className={`toolbar-button ${changingClass}`}
        onClick={() => toggleControl(name)}
        title={title}
        disabled={disabled}
      >
        {icon}
      </button>
      
      {isActive && (
        <div className={`toolbar-panel ${name}-panel`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default ToolbarControl; 