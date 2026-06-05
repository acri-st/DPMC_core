import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'DPMC',
  tagline: 'Orchestrate Earth observation data pipelines at any scale.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://dpmc-docs.dev.acrist-services.com',
  baseUrl: '/',

  organizationName: 'acrist-services',
  projectName: 'dpmc',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/dpmc-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'DPMC',
      logo: {
        alt: 'DPMC logo',
        src: 'img/logo-satellite.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Concepts', to: '/docs/concepts/overview' },
            { label: 'Architecture', to: '/docs/architecture/overview' },
            { label: 'Getting started', to: '/docs/getting-started/install' },
            { label: 'Roadmap', to: '/docs/roadmap' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DPMC — Data Production Management Core.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
