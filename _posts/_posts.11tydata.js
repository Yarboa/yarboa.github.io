const path = require('path');

module.exports = {
  layout: "post",
  eleventyComputed: {
    date: (data) => {
      // Extract date from filename (Jekyll-style: YYYY-MM-DD-title.md)
      const filename = path.basename(data.page.inputPath, path.extname(data.page.inputPath));
      const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})-/);
      if (match) {
        return new Date(match[1], parseInt(match[2]) - 1, match[3]);
      }
      // Fallback to file creation date
      return data.page.date;
    },
    permalink: (data) => {
      // Extract date and title from filename
      const filename = path.basename(data.page.inputPath, path.extname(data.page.inputPath));
      const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
      if (match) {
        const [, year, month, day, slug] = match;
        // Use categories from frontmatter if available, otherwise use 'blog'
        const category = data.categories ? data.categories.replace(/\s+/g, '/') : 'blog';
        return `/${category}/${year}/${month}/${day}/${slug}.html`;
      }
      return false;
    }
  }
};
