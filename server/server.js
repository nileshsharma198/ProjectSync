import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import { clerkMiddleware } from '@clerk/express'
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';

const app = express();

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.get('/', (req,res) => res.send('Server is Liveeee ...'));

app.use("/api/inngest", serve({ client: inngest, functions }));   // Assuming inngest and functions are imported from inngest index file

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));