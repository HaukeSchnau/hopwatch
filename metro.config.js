// Metro config. With STINT_DIRECTION set (development only), Metro ignores the other four
// directions, so each builder's Metro only bundles and watches the core plus one direction.
// expo-router's route discovery honours the block list, so the other routes disappear.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const directions = ['glass', 'deck', 'almanac', 'orbit', 'jelly', 'jelly1'];
const only = process.env.STINT_DIRECTION;

if (only) {
  const others = directions.filter((d) => d !== only).join('|');
  config.resolver.blockList = [
    ...[config.resolver.blockList].flat(),
    new RegExp(`[\\\\/]src[\\\\/](app|directions)[\\\\/](${others})[\\\\/]`),
  ];
}

module.exports = config;
