// Bun's bundler turns asset imports into URLs (hashed files in dist/); under
// `bun test` they evaluate to absolute file paths (fact 7).
declare module "*.png" {
  const url: string;
  export default url;
}
declare module "*.wav" {
  const url: string;
  export default url;
}
declare module "*.ogg" {
  const url: string;
  export default url;
}
