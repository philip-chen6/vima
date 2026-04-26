// Flat config for ESLint 9 + eslint-config-next 16.
// eslint-config-next 16 ships flat-config exports natively, no FlatCompat needed.
import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...next,
  ...nextCoreWebVitals,
  ...nextTs,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "components/react-bits/**",
      "components/blocks/**",
    ],
  },
];

export default config;
