import { definePrismaConfig } from 'prisma/config';

export default definePrismaConfig({
    schema: './schema.prisma',
    skills: {
        agents: ['claude', 'cursor', 'agents', 'devin'],
    },
});
