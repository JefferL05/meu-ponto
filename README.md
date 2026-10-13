# Meu Ponto 2.0

Aplicativo web progressivo para registrar entradas e saídas, acompanhar a jornada diária, consultar o histórico e calcular horas extras.

## Tecnologias

- [Astro](https://astro.build/)
- JavaScript
- CSS
- Service Worker para suporte offline

## Requisitos

- Node.js compatível com a versão do Astro indicada em `package.json`
- npm

## Executar localmente

```bash
npm install
npm run dev
```

Para validar a versão de produção:

```bash
npm run build
npm run preview
```

## Funcionalidades

- Registro de ponto e acompanhamento da jornada
- Histórico de registros
- Cálculo de horas extras
- Suporte a BRL e PYG no módulo de moedas
- Interface responsiva e recursos de PWA

## Observações

Os dados são armazenados localmente no navegador. Faça backups regulares; limpar os dados do navegador pode remover os registros. Antes de usar como registro oficial de jornada, valide os cálculos e as regras aplicáveis ao seu regime de trabalho.

## Estado do projeto

Em desenvolvimento. A cobertura de testes e a validação de produção devem ser ampliadas antes de uso crítico.
