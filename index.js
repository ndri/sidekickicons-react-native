// Icons are imported from their style's directory; this file only explains that.

module.exports = new Proxy(
  {},
  {
    get: (_, property) => {
      if (property === "__esModule") {
        return {};
      }

      throw new Error(
        `Importing from \`@sidekickicons/react-native\` directly is not supported. Please import from either \`@sidekickicons/react-native/16/solid\`, \`@sidekickicons/react-native/20/solid\`, \`@sidekickicons/react-native/24/solid\`, or \`@sidekickicons/react-native/24/outline\` instead.`
      );
    },
  }
);
