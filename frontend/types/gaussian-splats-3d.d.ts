// Type shim for @mkkellogg/gaussian-splats-3d. The package ships only
// .cjs + .esm bundles without declarations, so we declare the surface
// the splat-viewer actually touches as `any`. Good enough for prod
// rendering — this file is the line of defense between the build and
// "implicit any" failures.

declare module "@mkkellogg/gaussian-splats-3d" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GaussianSplats3D: any;
  export = GaussianSplats3D;
}
