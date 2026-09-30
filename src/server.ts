import express from 'express';
import { PrismaClient } from '@prisma/client';
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json" with { type: "json" };

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
    const { title, genre_id, language_id, oscar_count, release_date } =
        req.body;

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

        await prisma.movie.create({
            data: {
                title,
                genre_id,
                language_id,
                oscar_count,
                release_date: new Date(release_date),
            },
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
        const movie = await prisma.movie.findUnique({
            where: { id },
        });

        if (!movie) {
            return res.status(404).send({ message: 'Filme não encontrado.' });
        }

        const data = { ...req.body };
        data.release_date = data.release_date
            ? new Date(data.release_date)
            : undefined;

        await prisma.movie.update({
            where: {
                id,
            },
            data: data,
        });
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
            return res.status(404).send({ message: 'O filme não foi encontrado.' });
        }

        await prisma.movie.delete({ where: { id } });
    } catch (error) {
        return res.status(500).send({ message: 'Não foi possível remover o filme.' });
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
        return res.status(500).send({ message: 'Falha ao fazer a filtragem.' }); 
    }
});

// - RODAR SERVIDOR
app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
});
