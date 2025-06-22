# Plan to Refactor App.css

The goal is to break down the monolithic `App.css` file into smaller, more manageable files based on their function or the component they style.

## 1. Analysis

*   **`App.css`** contains global styles (like CSS variables and resets), layout styles, and component-specific styles for the header, language selector, translation interface, emergency phrases, tooltips, and more.
*   **`App.tsx`** imports this single large CSS file, which applies styles globally.
*   Some components already have their own CSS files (e.g., `frontend/src/components/TranslationInterface.css`), but `App.css` still contains styles that should probably be in those files.

## 2. Proposed New Structure

A new `styles` directory will be created in `frontend/src` for global stylesheets. Component-specific styles will be moved into the CSS files of their respective components.

Here’s the proposed structure:

```
frontend/src/
├── styles/
│   ├── _variables.css      # :root variables (colors, fonts, etc.)
│   ├── global.css          # Global resets and base body styles
│   ├── layout.css          # Main app layout, header, and footer
│   ├── accessibility.css   # Accessibility styles (skip links, focus, etc.)
│   ├── emergency.css       # All emergency-related styles
│   └── tooltips.css        # Styles for performance and medical tooltips
│
└── components/
    ├── LanguageSelector.css
    ├── TranslationInterface.css
    └── ... (other component CSS files)
```

## 3. Refactoring Steps

1.  **Create New Files & Directories**: Create the `frontend/src/styles` directory and the new global CSS files within it.
2.  **Move Styles**: Systematically move blocks of CSS from `App.css` into the appropriate new files.
3.  **Update Imports**: Update `frontend/src/index.tsx` to import the new global stylesheets in the correct order. Component-specific CSS files will be imported directly by their corresponding components.
4.  **Cleanup**: The original `App.css` will be significantly smaller, containing only styles that are truly specific to the `App` component's layout, or it might be removed entirely.

## 4. Visual Plan

```mermaid
graph TD
    A[Start: Large App.css] --> B{Analyze & Categorize Styles};
    B --> C[Define New File Structure];
    C --> D{Execute Refactoring};
    D --> E[1. Create new files in /styles];
    D --> F[2. Move styles from App.css];
    D --> G[3. Update imports in .tsx files];
    D --> H[4. Clean up App.css];
    H --> I[End: Modular & Maintainable CSS];