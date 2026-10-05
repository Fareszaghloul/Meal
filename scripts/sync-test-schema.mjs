import fs from 'fs';

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace('env("DATABASE_URL")', 'env("TEST_DATABASE_URL")');
content = content.replace('env("PRISMA_DATABASE_URL")', 'env("TEST_DATABASE_URL")');
fs.writeFileSync('prisma/schema.test.prisma', content);
console.log('Synchronized schema.test.prisma with schema.prisma');
