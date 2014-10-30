/*jslint node: true */
'use strict';

var exec = require('../lib/exec'),
    fs = require('fs'),
    path = require('path'),
    appDir = path.dirname(require.main.filename);
/** command description. */
exports.cliVersion = '>=3.2.1';
exports.title = 'Build w/Calabash';
exports.desc = 'Builds a project and injects the Calabash framework';
/**
 * Returns the configuration for the  command.
 * @param {Object} logger - The logger instance
 * @param {Object} config - The CLI config object
 * @param {CLI} cli - The CLI instance
 * @returns {Object} Status command configuration
 */
exports.config = function() {
    return {
        skipBanner: true,
        keystore_location: {
            abbr: 'K',
            desc: 'the location of the keystore used to sign this application',
            hint: 'keystore location',
            skipValueCheck: true
        },
        password: {
            abbr: 'P',
            desc: 'the password of the keystore used to sign this application',
            hint: 'keystore password',
            skipValueCheck: true
        },
        alias: {
            abbr: 'A',
            desc: 'the alias of the keystore used to sign this application',
            hint: 'keystore alias',
            skipValueCheck: true
        },
    };
};

/**
 * Runs the build command
 * @param {Object} logger - The logger instance
 * @param {Object} config - The CLI config object
 * @param {CLI} cli - The CLI instance
 * @param {Function} finished - Callback when the command finishes
 */
exports.run = function(logger, config, cli, finished) {
    var platform = (cli.argv.platform || cli.argv.p),
        projectDir = path.resolve(process.env.SOURCE_ROOT ? path.join(process.env.SOURCE_ROOT, '..', '..') : '.');

    logger.info("Starting TiCalabash for platform: "+platform);

    /* if they are not using ios or android, this command should gracefully bow out*/
    if (['android', 'ios', 'iphone'].indexOf(platform) === -1) {
        logger.execption('Calabash does not support your build target. \n Mobile Web support is planned, but not supported at this time.');
    }

    if (fs.existsSync(path.join(projectDir, 'tiapp.xml'))) {
        if ( ! fs.existsSync(path.join(projectDir, 'features'))) {
            logger.info('/features dir not present. Setting one up for you now.');

            var featuresFolder = path.resolve(path.join(appDir, '..', '..', 'ticalabash', 'assets', 'features'));
            var cucumberYML = path.resolve(path.join(appDir, '..', '..', 'ticalabash', 'assets', 'cucumber.yml'));

            exec('cp', ['-r', featuresFolder, path.join(projectDir, 'features')], null, function() {
				fs.createReadStream(cucumberYML).pipe(fs.createWriteStream(projectDir+"/cucumber.yml"));
				logger.info('cucumberYML is coming from'+ cucumberYML);
                logger.info('Features Directory created and cucumber.yml is set.');
            });
        }
        if (fs.existsSync(path.join(projectDir, 'app'))) {
            // do alloy crap here...
        }

        // require and run the correct platform...
        require('../lib/run_' + (platform === 'iphone' ? 'ios' : platform))(logger, config, cli, projectDir, finished);
    } else {
        logger.execption("Invalid Titanium project location");
    }
};