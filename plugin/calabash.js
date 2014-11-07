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
        options: {
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
            tags: {
                abbr: 'CT',
                desc: 'A comma seperated list of cucumber tags used to filter which features are run',
                hint: '@valid,@invalid',
                skipValueCheck: true
            },
            name: {
                abbr: 'CN',
                desc: 'Only execute the feature elements which match part of the given name. If this option is given more than once, it will match against all the given names.',
                hint: 'NAME',
                skipValueCheck: true
            },
            exclude: {
                abbr: 'CE',
                desc: 'Dont run feature files or require ruby files matching PATTERN',
                hint: 'PATTERN',
                skipValueCheck: true
            },
            format: {
                abbr: 'CF',
                desc: 'Dont run feature files or require ruby files matching PATTERN',
                hint: 'PATTERN',
                skipValueCheck: true
            }
        }
    };
};

/**
 * If present, remove Cucumber specific params from the array of params
 * to be passed to Titanium
 *
 * @param     {Array}    params  Array of params pass to the CLI
 */
function extractCucumberParams(params) {
    var cucumberParams = {
        '--tags': {
            aliasOf: false,
            hasValue: true // false if the param is a boolean flag
        },
        '-CT': {
            aliasOf: '--tags',
            hasValue: true
        },
        '--name': {
            aliasOf: false,
            hasValue: true
        },
        '-CN': {
            aliasOf: '--name',
            hasValue: true
        },
        '--format': {
            aliasOf: false,
            hasValue: true
        },
        '-CF': {
            aliasOf: '--format',
            hasValue: true
        }
    };
    var extractedCucumberParams = [];
    var extractedTiParams = [];
    var skipNextParam = false; // indicate if the next param in the list should be skipped, typically because is a value

    params.forEach(function(param, i) {
        var cp;

        if (skipNextParam) {
            skipNextParam = false;
            return;
        }

        if (cucumberParams.hasOwnProperty(param)) {
            cp = cucumberParams[param];
            // If the param is an alias, grab the proper param instead
            if (cp.aliasOf) {
                param = cp.aliasOf;
                cp = cucumberParams[cp.aliasOf];
            }
            extractedCucumberParams.push(param);
            // param is a key value pair, extract the value and set it to
            // be ignored by the next iteration
            if (cp.hasValue) {
                skipNextParam = true;
                extractedCucumberParams.push(params[i+1]);
            }
        } else {
            extractedTiParams.push(param);
        }
    });

    return {
        cucumberParams: extractedCucumberParams,
        tiParams: extractedTiParams
    };
}

/**
 * Runs the build command
 * @param {Object} logger - The logger instance
 * @param {Object} config - The CLI config object
 * @param {CLI} cli - The CLI instance
 * @param {Function} finished - Callback when the command finishes
 */
exports.run = function(logger, config, cli, finished) {
    var platform = (cli.argv.platform || cli.argv.p),
        projectDir = path.resolve(process.env.SOURCE_ROOT ? path.join(process.env.SOURCE_ROOT, '..', '..') : '.'),
        passthroughCommands = ['build', '-b'].concat(cli.argv['$_'].slice(3)),
        extractedParams = extractCucumberParams(passthroughCommands),
        cucumberParams = extractedParams.cucumberParams,
        tiParams = extractedParams.tiParams;

    logger.info("Starting TiCalabash for platform: "+platform);

    /* if they are not using ios or android, this command should gracefully bow out*/
    if (['android', 'ios', 'iphone'].indexOf(platform) === -1) {
        throw 'Calabash does not support your build target. \n Mobile Web support is planned, but not supported at this time.';
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

        cli.__cucumberParams = cucumberParams;
        cli.__passthroughCommands = tiParams;

        // require and run the correct platform...
        require('../lib/run_' + (platform === 'iphone' ? 'ios' : platform))(logger, config, cli, projectDir, finished);
    } else {
         throw "Invalid Titanium project location";
    }
};