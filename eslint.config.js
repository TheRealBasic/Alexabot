const sharedRules = {
  "no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_"
    }
  ],
  "no-duplicate-imports": "warn",
  "sort-imports": [
    "warn",
    {
      ignoreCase: true,
      ignoreDeclarationSort: false,
      ignoreMemberSort: false
    }
  ]
};

export default [
  {
    ignores: ["node_modules/**"]
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        URLSearchParams: "readonly",
        WebSocket: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly"
      }
    },
    rules: sharedRules
  },
  {
    files: ["server/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly"
      }
    },
    rules: sharedRules
  }
];
