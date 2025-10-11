
/**
 * Main navigation hub with directional keyboard-style layout.
 * Creates intuitive spatial navigation where users understand which direction takes them where.
 */
import './MainViewport.css';
import ArrowUp from '../assets/icons/arrow-up-s-line.svg?react';
import ArrowLeft from '../assets/icons/arrow-left-s-line.svg?react';
import ArrowRight from '../assets/icons/arrow-right-s-line.svg?react';
import ArrowDown from '../assets/icons/arrow-down-s-line.svg?react';
import {
  MainView,
  ClientsView,
  PendingView,
  HistoryView,
  ConfigView,
} from './MainViewportViews';
import type { ViewType } from './MainViewportViews';
import { useState, useRef, useEffect } from 'react';
import { slideTransitionStyles } from './transitionStyles';
import { invoke } from '@tauri-apps/api/core';
import type { SlideDirection } from './transitionStyles';
import { triggerDataSync } from '../hooks/useDataSync';

/**
 * Spatial navigation logic that feels like a cross-shaped remote control.
 * Main view is center, with other views arranged logically around it.
 */
const NAV_MAP: Record<ViewType, {
  up: ViewType;
  down: ViewType;
  left: ViewType;
  right: ViewType;
}> = {
  main:    { up: 'clients', down: 'config', left: 'pending', right: 'history' },
  clients: { up: 'clients', down: 'main', left: 'main', right: 'main' },
  pending: { up: 'main', down: 'main', left: 'history', right: 'main' },
  history: { up: 'main', down: 'main', left: 'main', right: 'pending' },
  config:  { up: 'main', down: 'config', left: 'main', right: 'main' },
};

/**
 * Button labels that show users where each direction will take them.
 * Empty strings hide buttons that don't make logical sense from current view.
 */
const VIEW_LABELS: Record<ViewType, { top: string; left: string; right: string; bottom: string }> = {
  main:    { top: 'Clients', left: 'Pending', right: 'Finished', bottom: 'Config' },
  clients: { top: '', left: '', right: '', bottom: ' ' },
  pending: { top: '', left: '', right: ' ', bottom: '' },
  history: { top: '', left: ' ', right: '', bottom: '' },
  config:  { top: ' ', left: '', right: '', bottom: '' },
};

function getViewComponent(view: ViewType) {
  switch (view) {
    case 'main': return <MainView />;
    case 'clients': return <ClientsView />;
    case 'pending': return <PendingView />;
    case 'history': return <HistoryView />;
    case 'config': return <ConfigView />;
    default: return null;
  }
}

const MainViewport = () => {
  const [view, setView] = useState<ViewType>('main');
  const [transition, setTransition] = useState<{direction: SlideDirection, nextView: ViewType, type: 'exit' | 'enter'} | null>(null);
  const [displayView, setDisplayView] = useState<ViewType>('main');
  const [appVersion, setAppVersion] = useState<string>('0.5.1'); // Default fallback
  const timeoutRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Fetch app version from Cargo.toml
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await invoke<string>('get_app_version');
        setAppVersion(version);
      } catch (error) {
        console.warn('Failed to fetch app version:', error);
        // Keep the default fallback version
      }
    };
    fetchVersion();
  }, []);

  /**
   * Smooth animated navigation with intelligent data prefetching.
   * Only syncs data when moving to data-heavy views, with throttling to prevent spam.
   */
  const handleNav = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (transition) return; // Prevent double-clicks breaking animation state
    
    const nextView = NAV_MAP[view][dir];
    let direction: SlideDirection;
    switch (dir) {
      case 'up': direction = 'up'; break;
      case 'down': direction = 'down'; break;
      case 'left': direction = 'left'; break;
      case 'right': direction = 'right'; break;
      default: direction = 'right';
    }
    
    setTransition({ direction, nextView, type: 'exit' });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = window.setTimeout(() => {
      setView(nextView);
      setTransition({ direction, nextView, type: 'enter' });
      setDisplayView(nextView);
      
      // Smart data loading: only fetch when users actually need business data
      if (nextView === 'pending' || nextView === 'history' || nextView === 'clients') {
        const now = Date.now();
        if (now - lastSyncRef.current > 2000) {
          lastSyncRef.current = now;
          triggerDataSync();
        }
      }
      
      window.setTimeout(() => {
        setTransition(null);
      }, 50);
    }, 50);
  };

  const labels = VIEW_LABELS[view];

  /**
   * Dynamic CSS class assignment for smooth directional transitions.
   * Creates visual continuity that helps users understand spatial navigation.
   */
  let centerClass = '';
  if (transition) {
    if (transition.type === 'exit') {
      centerClass = slideTransitionStyles[transition.direction].exit;
    } else {
      centerClass = slideTransitionStyles[transition.direction].enter;
    }
  }

  return (
    <div className="viewport-container">
      <div className="viewport-box comm-main">
        {/* Top Arrow and Label */}
        {labels.top && (
          <div className="comm-top" onClick={() => handleNav('up')} style={{cursor: 'pointer'}}>
            <ArrowUp className="comm-arrow comm-arrow-up" />
            <div className="comm-label comm-label-top">{labels.top}</div>
          </div>
        )}

        {/* Left Arrow and Label */}
        {labels.left && (
          <div 
            className="comm-left" 
            onClick={() => handleNav('left')} 
            style={{
              cursor: 'pointer',
              zIndex: 10, // Ensure it's above other elements
              pointerEvents: 'auto' // Explicitly enable pointer events
            }}
          >
            <ArrowLeft className="comm-arrow comm-arrow-left" />
            <div className="comm-label comm-label-left">{labels.left}</div>
          </div>
        )}

        {/* Center Content with transition */}
        <div className={`comm-center${centerClass ? ` ${centerClass}` : ''}`}>
          {getViewComponent(displayView)}
        </div>

        {/* Right Arrow and Label */}
        {labels.right && (
          <div className="comm-right" onClick={() => handleNav('right')} style={{cursor: 'pointer'}}>
            <div className="comm-label comm-label-right">{labels.right}</div>
            <ArrowRight className="comm-arrow comm-arrow-right" />
          </div>
        )}

        {/* Bottom Arrow and Label */}
        {labels.bottom && (
          <div className="comm-bottom" onClick={() => handleNav('down')} style={{cursor: 'pointer'}}>
            <div className="comm-label comm-label-bottom">{labels.bottom}</div>
            <ArrowDown className="comm-arrow comm-arrow-down" />
          </div>
        )}

        {/* Version: only show in main menu */}
        {view === 'main' && (
          <div className="comm-version">Ver: <span className="comm-version-number">{appVersion}</span></div>
        )}  
      </div>
    </div>
  );
};

export default MainViewport;

