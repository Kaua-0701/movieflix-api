import express from 'express';
import { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json' with { type: 'json' };

const port = 3000;
const app = express();
const prisma = new PrismaClient();

const isValidMovieTitle = (title: unknown): title is string =>
    typeof title === 'string' &&
    title.trim().length > 0 &&
    title.trim().toLowerCase() !== 'string';

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// - LISTAGEM DE FILMES
app.get('/movies', async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: { title: 'asc' },
        include: { genres: true, languages: true },
    });
    res.json(movies);
});

// - CADASTRO DE FILMES
app.post('/movies', async (req, res) => {
    const {
        title,
        genre_id,
        language_id,
        oscar_count,
        release_date,
        director,
    } = req.body;

    // Validação do campo obrigatório
    if (!isValidMovieTitle(title)) {
        return res.status(400).send({
            message:
                'O campo "title" é obrigatório e não pode ser apenas "string".',
        });
    }

    try {
        const movieWithSameTitle = await prisma.movie.findFirst({
            where: {
                title: {
                    equals: title,
                    mode: 'insensitive',
                },
            },
        });

        if (movieWithSameTitle) {
            return res.status(409).send({
                message: 'Já existe um filme cadastrado com esse título.',
            });
        }

        const movieData = {
            title: title.trim(),
            release_date: new Date(release_date),
            director: director.trim(),
            ...(genre_id !== undefined && genre_id !== null
                ? { genre_id: Number(genre_id) }
                : {}),
            ...(language_id !== undefined && language_id !== null
                ? { language_id: Number(language_id) }
                : {}),
            ...(oscar_count !== undefined && oscar_count !== null
                ? { oscar_count: Number(oscar_count) }
                : {}),
        };

        await prisma.movie.create({
            data: movieData,
        });
    } catch (error) {
        return res.status(500).send({ message: 'Falha ao cadastrar o filme.' });
    }

    res.status(201).send({ message: 'Filme cadastrado com sucesso!' });
});

// - ATUALIZAÇÃO DE FILMES
app.put('/movies/:id', async (req, res) => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({ where: { id } });

        if (!movie) {
            return res.status(404).send({ message: 'Filme não encontrado.' });
        }

        const data = { ...req.body };

        if (data.title !== undefined && !isValidMovieTitle(data.title)) {
            return res.status(400).send({
                message:
                    'O campo "title" não pode estar vazio nem ser apenas "string".',
            });
        }

        if (data.release_date) {
            const date = new Date(data.release_date);
            if (isNaN(date.getTime())) {
                return res.status(400).send({
                    message: 'O campo "release_date" deve ser uma data válida.',
                });
            }
            data.release_date = date;
        } else {
            data.release_date = undefined;
        }

        data.title = data.title?.trim() || undefined;
        data.director = data.director?.trim() || undefined;

        // Se o título mudou, verifica duplicidade (ignorando o próprio filme)
        if (data.title) {
            const duplicate = await prisma.movie.findFirst({
                where: {
                    title: { equals: data.title, mode: 'insensitive' },
                    NOT: { id },
                },
            });

            if (duplicate) {
                return res.status(409).send({
                    message: 'Já existe um filme cadastrado com esse título.',
                });
            }
        }

        await prisma.movie.update({ where: { id }, data });
    } catch (error) {
        return res
            .status(500)
            .send({ message: 'Falha ao atualizar o registro do filme.' });
    }

    res.status(200).send({ message: 'Filme atualizado com sucesso!' });
});

// - REMOÇÃO DE FILMES
app.delete('/movies/:id', async (req, res) => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({ where: { id } });

        if (!movie) {
            return res.status(404).send({ message: 'Filme não encontrado' });
        }

        await prisma.movie.delete({ where: { id } });
    } catch (error) {
        return res
            .status(500)
            .send({ message: 'Não foi possível remover o filme' });
    }

    res.status(200).send({ message: 'Filme deletado com sucesso!' });
});

// - FILTRAR FILMES POR GÊNERO
app.get('/movies/:genreName', async (req, res) => {
    try {
        const moviesFilteredByGenreName = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true,
            },

            where: {
                genres: {
                    name: {
                        equals: req.params.genreName,
                        mode: 'insensitive',
                    },
                },
            },
        });

        res.status(200).send(moviesFilteredByGenreName);
    } catch (error) {
        return res
            .status(500)
            .send({ message: 'Falha ao fazer a filtragem do gênero.' });
    }
});

// - RODAR SERVIDOR
app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
});
