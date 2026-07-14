import { print } from 'graphql';
import * as g from './src/lib/graphql.js';
import { writeFileSync } from 'fs';
const doc = print(g.FORUM_OVERVIEW_QUERY);
writeFileSync('/tmp/fo.graphql', doc);
import { execSync } from 'child_process';
