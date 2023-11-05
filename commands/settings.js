const { default: axios } = require('axios');
const Discord = require('discord.js');
const { Repository } = require('typeorm');
const humanizedPreferences = {
  "game":"Main Game"
}
var Filter = require('bad-words');
var swearFilter = new Filter({ placeHolder: '#'});
swearFilter.addWords(...[
  'anal',        'anus',     'arse',    'ass',
  'b1tch',       'ballsack', 'bastard', 'bitch',
  'biatch',      'blowjob',  'bollock', 'bollok',
  'boner',       'boob',     'boobs',   'buttplug',
  'clitoris',    'cock',     'cum',     'cunt',
  'dick',        'dildo',    'dyke',    'erection',
  'fag',         'faggot',   'feck',    'fellate',
  'fellatio',    'felching', 'fuck',    'fucks',
  'fudgepacker', 'genitals', 'hell',    'jerk',
  'jizz',        'knobend',  'labia',   'masturbate',
  'muff',        'nigger',   'nigga',   'penis',
  'piss',        'poop',     'pube',    'pussy',
  'scrotum',     'sex',      'shit',    'sh1t',
  'slut',        'smegma',   'spunk',   'tit',
  'tranny',      'trannies', 'tosser',  'turd',
  'twat',        'vagina',   'wank',    'whore',
  'tits',        'titty',    'asshole', 'fvck',
  'asshat',      'pu55y',    'pen1s',   'sexual',
  'sex',          'nudes',    'nigga',   'nigger',
  'nig'
  ])
const {
  UserSettings: settingsModel
} = require('../sqliteModel/UserSettings');
  module.exports = {
    name: "settings",
    aliases: ["config", "description"],
    description: "Change/view your settings for Nana!",
    examples: [],
    /** 
    * @param {Discord.Message} message Message class
    * @param {Array} args User provided arguments.
    * @param {Discord.Client} client Discord.js client
    */
    async execute(message, args, client) {
      if (args.executor == 'description') {
        if (!args[0]) return message.channel.send(":x: | Specify your description or burn!")
        const description = swearFilter.clean(args.join(" "));
        if (description.length > 200) return message.channel.send(":x: | Your description may not be any longer than 200 characters.")
        /** @type {Repository} */
        const LinkedAccounts = client.db.getRepository("LinkedAccount");
        /** @type {Repository} */
        const UserSettings = client.db2.getRepository(settingsModel);
        /** @type {Repository} */
        const linkedAccount = await LinkedAccounts.findOne({discord: message.author.id})
        if (!linkedAccount) return message.channel.send("Far as I can tell, you're not linked to Minecraft. Run `/discord link` in-game.")
        /** @type {settingsModel} */
        const userSetting = await UserSettings.findOne({uuid: linkedAccount.uuid});
        if (userSetting) {
          if (userSetting.description == description) return message.channel.send(":x: | You cannot put your description as what you already have it as... SEEMS CONFUSING, RIGHT? WELL, YOU DUMBY, FIGURE IT OUT") 
          await UserSettings.save({id: userSetting.id, description: description, discord: linkedAccount.discord});
        }
        else {
          const result = await UserSettings.create({uuid: linkedAccount.uuid, description, discord: linkedAccount.discord})
          await UserSettings.save(result);
          console.log(result)
          }
        return message.channel.send(":white_check_mark: | Description is set, probably.")
      }
      else {
      // const userPreferences = client.db()
      switch(args[0].toLowerCase()) {
        case 'set':
          break;
        default:
          return message.channel.send(":x: | Not a valid configuration option, back to square one. Rerun this command when you can make up your mind.");
      } 
      }
    }
  };