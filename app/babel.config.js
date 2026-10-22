module.exports = function (api) {
  const isProd = process.env.NODE_ENV === 'production'
  // Cache varia por NODE_ENV para o plugin de produção ligar/desligar corretamente.
  api.cache.using(() => process.env.NODE_ENV)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Remove TODOS os console.* do bundle de PRODUÇÃO (dev mantém os logs).
      ...(isProd ? ['transform-remove-console'] : []),
    ],
  }
}
