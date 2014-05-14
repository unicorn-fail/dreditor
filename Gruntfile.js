/*global module:false*/
/*global require:false*/
/*global process:false*/
module.exports = function(grunt) {
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/**\n' +
      ' * <%= pkg.title || pkg.name %> <%= pkg.version %>\n' +
      '<%= pkg.homepage ? " * " + pkg.homepage + "\\n" : "" %>' +
      ' * <%= pkg.description %>\n' +
      ' * Licensed under <%= _.pluck(pkg.licenses, "type").join(", ") %>\n *\n' +
      ' * Maintainers:' +
      '<% _.forEach(pkg.maintainers, function(maintainer) {%>\n *   <%= maintainer.name %> - <%= maintainer.url %><% }); %>\n *\n' +
      ' * Last build: <%= grunt.template.today("yyyy-mm-dd h:MM:ss TT Z") %>\n' +
      ' */\n',
    // Task configuration.
    clean: {
      files: [
        'build/*',
        'release/*'
      ]
    },
    less: {
      options: {
        cleancss: true
      },
      files: {
        src: 'src/less/**/*.less',
        dest: 'build/<%= pkg.name %>.css'
      }
    },
    css2js: {
      convert: {
        src: 'build/<%= pkg.name %>.css',
        dest: 'build/<%= pkg.name %>.css.js'
      }
    },
    concat: {
      options: {
        banner: '<%= banner %>' + grunt.file.read('src/js/_banner.header.js'),
        footer: grunt.file.read('src/js/_banner.footer.js'),
        stripBanners: true
      },
      build: {
        src: [
          'src/js/**/*.js',
          '!src/js/_banner.header.js',
          '!src/js/_banner.footer.js',
          '!src/js/init.js',
          'build/<%= pkg.name %>.css.js',
          'src/js/init.js'
        ],
        dest: 'build/<%= pkg.name %>.js'
      }
    },
    jshint: {
      options: {
        reporter: require('jshint-stylish')
      },
      package: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: 'package.json'
      },
      gruntfile: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: 'Gruntfile.js'
      },
      js: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: 'src/js/**/*.js'
      }
    },
    sed: {
      name: {
        path: 'build/',
        pattern: '%PKG.NAME%',
        replacement: '<%= pkg.name %>',
        recursive: true
      },
      title: {
        path: 'build/',
        pattern: '%PKG.TITLE%',
        replacement: '<%= pkg.title || pkg.name %>',
        recursive: true
      },
      description: {
        path: 'build/',
        pattern: '%PKG.DESCRIPTION%',
        replacement: '<%= pkg.description %>',
        recursive: true
      },
      homepage: {
        path: 'build/',
        pattern: '%PKG.HOMEPAGE%',
        replacement: '<%= pkg.homepage || "" %>',
        recursive: true
      },
      author: {
        path: 'build/',
        pattern: '%PKG.AUTHOR%',
        replacement: '<%= pkg.author.name %>',
        recursive: true
      },
      icon: {
        path: 'build/',
        pattern: '%PKG.ICON%',
        replacement: '<%= pkg.icon || "icon.png" %>',
        recursive: true
      },
      license: {
        path: 'build/',
        pattern: '%PKG.LICENSE%',
        replacement: '<%= _.pluck(pkg.licenses, "type").join(", ") %>',
        recursive: true
      },
      version: {
        path: 'build/',
        pattern: '%PKG.VERSION%',
        replacement: '<%= pkg.version %>',
        recursive: true
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>',
        beautify: true
      },
      default: {
        src: '<%= concat.build.dest %>',
        dest: 'build/<%= pkg.name %>.js'
      }
    },
    copy: {
      chrome: {
        files: [
          {
            expand: true,
            cwd: 'templates/chrome/',
            src: ['**'],
            dest: 'build/chrome/'
          },
          {
            expand: true,
            cwd: 'src/',
            src: ['icon.png'],
            dest: 'build/chrome/'
          },
          {
            expand: true,
            cwd: 'build/',
            src: ['<%= pkg.name %>.js'],
            dest: 'build/chrome/'
          }
        ]
      },
      firefox: {
        files: [
          {
            expand: true,
            cwd: 'templates/firefox/',
            src: ['**'],
            dest: 'build/firefox/'
          },
          {
            expand: true,
            cwd: 'src/',
            src: ['icon.png'],
            dest: 'build/firefox/'
          },
          {
            expand: true,
            cwd: 'build/',
            src: ['<%= pkg.name %>.js'],
            dest: 'build/firefox/data/'
          }
        ]
      },
      safari: {
        files: [
          {
            expand: true,
            cwd: 'templates/safari/',
            src: ['Info.plist', 'Settings.plist'],
            dest: 'build/<%= pkg.name %>.safariextension/'
          },
          {
            expand: true,
            cwd: 'templates/safari/',
            src: ['update.plist'],
            dest: 'build/'
          },
          {
            expand: true,
            cwd: 'src/',
            src: ['icon.png'],
            dest: 'build/<%= pkg.name %>.safariextension/'
          },
          {
            expand: true,
            cwd: 'build/',
            src: ['<%= pkg.name %>.js'],
            dest: 'build/<%= pkg.name %>.safariextension/'
          }
        ]
      }
    },
    watch: {
      files: [
        // Force-exclude artifacts.
        // Despite not being included in the list of files, the watch task can
        // be intermittently interrupted by a build:* task with:
        // >> File "release" added.
        // which may even cause an infinite loop. Seemingly a bug in watch;
        // possibly limited to Windows/NTFS/msys. Exclusions must be defined
        // first; all arguments are processed/merged sequentially.
        '!build',
        '!build/**',
        '!release',
        '!release/**',
        '<%= jshint.package.src %>',
        '<%= jshint.gruntfile.src %>',
        '<%= jshint.js.src %>',
        '<%= less.files.src %>',
        '<%= qunit.all %>'
      ],
      tasks: ['default'],
      options: {
        interrupt: true
      }
    },
    release: {
      options: {
        add: false,
        commit: false,
        tag: false,
        push: false,
        pushTags: false,
        npm: false
      }
    },
    compress: {
      chrome: {
        options: {
          archive: 'release/chrome/<%= pkg.name %>.zip',
          mode: 'zip'
        },
        expand: true,
        cwd: 'build/chrome/',
        src: ['**/*'],
        dest: '/'
      }
    },
    "mozilla-addon-sdk": {
      'master': {
        options: {
          revision: "master",
          github: true
        }
      }
    },
    "mozilla-cfx-xpi": {
      'release': {
        options: {
          "mozilla-addon-sdk": "master",
          extension_dir: "build/firefox",
          dist_dir: "release/firefox",
          // --output-file is an experimental option, not guaranteed to exist.
          // @see https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx#Experimental_Options_3
          arguments: "--output-file=<%= pkg.name %>.xpi"
        }
      }
    },
    'qunit' : {
      all: "tests/**/*.html"
    },
    exec: {
      build_safari_ext: {
        stdout: false,
        stderr: false,
        cmd: function () {
          var args = [
            'build-safari-ext',
            this.template.process('<%= pkg.name %>'),
            this.template.process(process.cwd() + '/build/<%= pkg.name %>.safariextension'),
            process.cwd() + '/release/safari'
          ];
          return args.join(' ');
        },
        callback: function (error) {
          if (error) {
            grunt.log.warn('Unable to create ' + String(grunt.template.process('release/safari/<%= pkg.name %>.safariextension')).red);
          }
          else {
            grunt.log.writeln('Created ' + String(grunt.template.process('release/safari/<%= pkg.name %>.safariextension')).cyan);
          }
        }
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-css2js');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-mozilla-addon-sdk');
  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-sed');

  // Install tasks.
  grunt.registerTask('install', 'Installs dependencies.',
    ['mozilla-addon-sdk']);

  // Default tasks.
  grunt.registerTask('default', 'Compiles code.',
    ['clean', 'less', 'css2js', 'jshint', 'concat', 'copy', 'sed']);

  // Realtime development tasks.
  // Enjoy: `grunt watch:ff`
  // These tasks are highly tailored subsets of the default task having the goal
  // of *instant* reloading of a newly built extension into a particular browser.
  // The performance target is ~500ms; i.e., the time it takes a human to switch
  // from the code editor to the browser.
  // Note that grunt watch is not a multi-task; it supports multiple targets,
  // but it does not support multiple tasks/sets; when running `grunt watch`,
  // all targets are watched, and all tasks of all matching targets are executed
  // upon a change. We do not want to tamper with the default `grunt watch` task,
  // nor do we want to build all extensions at once (for performance reasons).
  // The recommended informal workaround is to dynamically swap out the default
  // config of the watch task ad-hoc.
  // @see https://github.com/gruntjs/grunt-contrib-watch/issues/71#issuecomment-26152333
  // Firefox.
  grunt.registerTask('dev:ff', 'Compiles code to build a Firefox extension. (see watch:ff)',
    ['less', 'css2js', 'jshint:js', 'concat', 'copy:firefox', 'sed']);
  grunt.registerTask('watch:ff', 'Enables real-time development for Firefox.', function () {
    var config = grunt.config('watch');
    config.tasks = ['dev:ff', 'build:firefox', 'autoload:ff'];
    // Auto-run once upon invocation.
    config.options.atBegin = true;
    config.options.spawn = false;
    grunt.config('watch', config);
    grunt.task.run('watch');
  });

  // Test tasks.
  grunt.registerTask('test', 'Runs tests.',
    ['qunit']);
  grunt.registerTask('travis-ci', 'Compiles code and runs tests.',
    ['default', 'test']);

  // Build tasks.
  grunt.registerTask('build', 'Compiles code and builds all extensions.',
    ['default', 'uglify', 'build:chrome', 'build:firefox', 'build:safari']);
  grunt.registerTask('build:chrome', 'Builds the Chrome extension.',
    ['compress:chrome']);
  grunt.registerTask('build:firefox', 'Builds the Firefox extension.',
    ['mozilla-cfx-xpi']);
  grunt.registerTask('build:safari', 'Builds the Safari extension.',
    ['exec:build_safari_ext']);

  // Autoload tasks.
  // Firefox.
  // @see https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/
  grunt.registerTask('autoload:ff', 'Loads the XPI extension into Firefox.', function () {
    var done = this.async();
    var xpi = 'release/firefox/' + grunt.template.process('<%= pkg.name %>.xpi');
    grunt.util.spawn({
      cmd: 'wget',
      args: [
        '--post-file=' + xpi,
        'http://localhost:8888'
      ],
      opts: !grunt.option('debug') ? {} : {
        stdio: 'inherit'
      }
    },
    function (error, result, code) {
      if (code !== 8) {
        return grunt.warn('Auto-loading ' + xpi + ' failed: (' + code + ') ' + error);
      }
      grunt.log.ok('Auto-loaded ' + xpi + ' into Firefox.');
      done();
    });
  });

};
