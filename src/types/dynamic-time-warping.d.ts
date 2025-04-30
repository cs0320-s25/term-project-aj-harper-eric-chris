declare module "dynamic-time-warping" {
  export default class DynamicTimeWarping {
    constructor(
      series1: number[] | number[][],
      series2: number[] | number[][],
      distanceFunction?: (a: number, b: number) => number
    );

    getDistance(): number;
    getPath(): [number, number][];
  }
}
