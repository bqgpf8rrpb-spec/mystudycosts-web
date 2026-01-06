'use client';

import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';

interface EuropeMapSVGProps {
  className?: string;
  style?: React.CSSProperties;
}

const EuropeMapSVG = ({ className = "", style }: EuropeMapSVGProps) => {
  const geoUrl = "https://code.highcharts.com/mapdata/custom/europe.topo.json";

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% { 
              fill-opacity: 0.1; 
              stroke-width: 0.5px; 
              filter: drop-shadow(0 0 2px #64ffda); 
            }
            50% { 
              fill-opacity: 0.4; 
              stroke-width: 2px; 
              filter: drop-shadow(0 0 10px #64ffda); 
            }
            100% { 
              fill-opacity: 0.1; 
              stroke-width: 0.5px; 
              filter: drop-shadow(0 0 2px #64ffda); 
            }
          }
          .germany-pulse {
            animation: pulse 3s infinite ease-in-out;
            fill: #64ffda;
          }
        `
      }} />
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 800, center: [10, 52] }}
        className={className}
        style={style}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => {
              const isGermany = geo.properties?.["iso-a2"] === "DE";
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className={isGermany ? "germany-pulse" : ""}
                  fill={isGermany ? "#64ffda" : "transparent"}
                  stroke="#64ffda"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", strokeWidth: 2 },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </>
  );
};

export default EuropeMapSVG;
