import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default defineConfig([
    {
        ignores: [
            'dist/**',
            'lib-esm/**',
            'lib-wasm/**',
            'lib-wasm-py/**',
            'docs/**',
            'node_modules/**',
            '.worktrees/**',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        plugins: {
            '@stylistic': stylistic,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.amd,
                dojo: 'readonly',
                dijit: 'readonly',
                dojoConfig: 'readonly',
                debugConfig: 'readonly',
                Promise: 'readonly',
            },
        },
        rules: {
            'no-redeclare': 'off',
            'no-empty': 'off',
            'no-empty-pattern': 'off',
            'no-constant-condition': 'off',
            'no-case-declarations': 'off',
            'no-prototype-builtins': 'off',
            'no-unused-vars': 'off',
            'no-useless-escape': 'off',
            'no-unexpected-multiline': 'off',
            'no-extra-boolean-cast': 'off',
            'no-self-assign': 'off',
            'prefer-rest-params': 'off',
            'prefer-spread': 'off',

            // New in the ESLint 10 recommended set. Reported as warnings so the
            // upgrade does not change the lint verdict; fix them and promote to 'error'.
            'preserve-caught-error': 'warn',
            'no-useless-assignment': 'warn',

            // Formatting rules moved out of ESLint core in v9/v10 and now live in @stylistic.
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
            '@stylistic/function-call-spacing': ['error', 'never'],
            '@stylistic/space-before-function-paren': ['error', {
                anonymous: 'always',
                named: 'never',
                asyncArrow: 'always',
            }],
            '@stylistic/comma-spacing': ['error', { before: false, after: true }],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],

            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-namespace': 'off',
        },
    },
]);
