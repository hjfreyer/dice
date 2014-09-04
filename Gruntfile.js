module.exports = function(grunt) {

  grunt.initConfig({
    clean: ['bin/'],
    copy: {
      main: {
        src: ['*.html'],
        dest: 'bin/'
      }
    },
    bower: {
      main: {
        dest: 'bin/bower_components'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-bower');

  grunt.registerTask('dev', ['clean', 'bower', 'copy']);

};
