declare module "maplibre-react-components" {
  import type { ReactNode } from "react";
  import type { Map as MapLibreMap } from "maplibre-gl";

  export interface RMapProps {
    // NOTE: the underlying library does not currently use a mapLib prop;
    // we keep it optional here for compatibility but do not pass it at runtime.
    mapLib?: typeof import("maplibre-gl");
    initialCenter?: [number, number];
    initialZoom?: number;
    minZoom?: number;
    mapStyle?: string;
    className?: string;
    style?: React.CSSProperties;
    onMounted?: (map: MapLibreMap) => void;
    onClick?: (e: unknown) => void;
    children?: ReactNode;
  }

  export function RMap(props: RMapProps): JSX.Element;

  export interface RMarkerProps {
    longitude: number;
    latitude: number;
    initialAnchor?:
      | "center"
      | "top"
      | "bottom"
      | "left"
      | "right"
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right";
    children?: ReactNode;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  }

  export function RMarker(props: RMarkerProps): JSX.Element;

  export interface RPopupProps {
    longitude: number;
    latitude: number;
    anchor?: string;
    closeButton?: boolean;
    offset?: number;
    children?: ReactNode;
  }

  export function RPopup(props: RPopupProps): JSX.Element;

  export interface RNavigationControlProps {
    position?: string;
    visualizePitch?: boolean;
  }

  export function RNavigationControl(
    props: RNavigationControlProps
  ): JSX.Element;

  export interface RSourceProps {
    id: string;
    type: string;
    data: any;
  }

  export function RSource(props: RSourceProps): JSX.Element;

  export interface RLayerProps {
    id: string;
    type: string;
    source: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
  }

  export function RLayer(props: RLayerProps): JSX.Element;
}

declare module "maplibre-gl/dist/maplibre-gl.css";
declare module "maplibre-react-components/style.css";
