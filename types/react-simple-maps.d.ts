declare module 'react-simple-maps' {
  import { ReactNode } from 'react';

  export interface Geography {
    rsmKey: string;
    [key: string]: any;
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (params: { geographies: Geography[] }) => ReactNode;
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
    };
    className?: string;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  export interface GeographyProps {
    geography: Geography;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    [key: string]: any;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
}

