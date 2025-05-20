declare module '@antv/g6' {
  interface IGraph {
    data(data: any): void;
    render(): void;
    clear(): void;
    destroy(): void;
    on(eventName: string, callback: Function): void;
    getNodes(): any[];
    setItemState(item: any, state: string, value: boolean): void;
    clearItemStates(item: any): void;
    changeSize(width: number, height: number): void;
    fitView(padding?: number): void;
    fitCenter(): void;
    destroyed?: boolean;
  }

  interface IGraphOptions {
    container: HTMLElement;
    width: number;
    height: number;
    fitView?: boolean;
    fitViewPadding?: number;
    animate?: boolean;
    modes?: Record<string, any[]>;
    layout?: Record<string, any>;
    defaultNode?: Record<string, any>;
    defaultEdge?: Record<string, any>;
    nodeStateStyles?: Record<string, any>;
    edgeStateStyles?: Record<string, any>;
    plugins?: any[];
  }

  interface ITooltip {
    new (config: any): any;
  }

  interface INodeConfig {
    getNode(name: string): any;
  }

  interface IG6 {
    Graph: {
      new (config: IGraphOptions): IGraph;
    };
    Tooltip: ITooltip;
    Node: INodeConfig;
    registerNode(name: string, config: any): void;
  }

  const G6: IG6;
  export = G6;
} 