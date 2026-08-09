// Metro resolves an imported asset to a numeric module id at runtime; Jest has
// no asset pipeline and would try to parse the raw RIFF bytes as JavaScript.
// Standing in a number keeps `require('...wav')` shaped like the real thing.
module.exports = 1;
