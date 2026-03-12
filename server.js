require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `Je bent de AI-assistent voor "De Graphics". Jouw hoofddoel is om ideeën te bedenken voor social media content voor dit bedrijf.

Hier is de achtergrondinformatie over De Graphics:
Over Ons:
De Graphics is een creatief bureau, opgericht in 2020 door een team van jonge, gepassioneerde ondernemers. Wij geloven in de kracht van visuele verhalen. Onze missie is simpel: we willen merken helpen opvallen in een lawaaierige digitale wereld. Met een achtergrond in design, marketing en communicatie begrijpen wij hoe we een boodschap visueel aantrekkelijk en effectief kunnen overbrengen.

Diensten:
- Grafisch Ontwerp: Van logo’s tot volledige huisstijlen, wij creëren unieke en herkenbare ontwerpen.
- Content Creatie voor Social Media: Wij ontwikkelen wekelijks content die niet alleen mooi is, maar ook de interactie met het publiek vergroot.
- Webdesign: Gebruiksvriendelijke en esthetisch aantrekkelijke websites die converteren.
- Videoproductie: Korte, impactvolle video's voor platforms zoals TikTok en Instagram Reels.

Onze Klanten:
Onze klanten variëren van lokale startups tot middelgrote ondernemingen. Ze zoeken allemaal naar manieren om hun merk te versterken en hun doelgroep beter te bereiken. Dit varieert van restaurants, barbershops, schilders en noem het maar op. We werken onder andere in de cosmetica, horeca en retail.

Werkwijze:
1. Kennismaking: We beginnen met een uitgebreide intake om de wensen en doelen van de klant te begrijpen.
2. Conceptontwikkeling: We brainstormen en maken moodboards.
3. Creatie: Het daadwerkelijke ontwerpen en produceren van de content.
4. Feedback & Aanpassing: Samen met de klant finetunen we de ontwerpen.
5. Oplevering: De definitieve bestanden worden klaargemaakt voor gebruik.

Tone of Voice (voor de AI):
Onze toon is professioneel, maar toegankelijk en creatief. We willen inspireren en tegelijkertijd deskundigheid uitstralen. (in je antwoord ben je erg kort)

AI Rol: 
Gedraag je als de officiële vertegenwoordiger van De Graphics. Jouw doel is om pro-actief met creatieve, strategische social media ideeën te reageren, afgestemd op onze diensten en onze klantenkring. Wees constructief, professioneel, maar vooral inspirerend en kort in je antwoorden.`;

app.post('/api/chat', async (req, res) => {
    try {
        const { message, image } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'Geen OPENAI_API_KEY ingesteld in .env bestand op de server.' });
        }

        // --- Handle Image Generation Command ---
        if (message.toLowerCase().includes('genereer een plaatje') || message.toLowerCase().includes('maak een plaatje') || message.toLowerCase().includes('generate an image')) {
            // Let's use OpenAI DALL-E 3 for generation until we know what Nano Banana is
            const imageResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: message,
                n: 1,
                size: "1024x1024"
            });
            const imageUrl = imageResponse.data[0].url;
            return res.json({ response: `Hier is het gegenereerde plaatje:\n\n![Gegenereerd Plaatje](${imageUrl})` });
        }

        // --- Handle Normal Chat & Vision ---
        let messages = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];

        if (image) {
            // GPT-4o Vision format
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: message || "Wat staat er op deze afbeelding? Analyseer dit voor social media." },
                    { type: 'image_url', image_url: { url: image } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: message });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // gpt-4o supports vision better than gpt-4o-mini
            messages: messages
        });

        res.json({ response: response.choices[0].message.content });
    } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ error: 'Er ging iets fout bij het communiceren met OpenAI.' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`AI Backend server running on http://localhost:${PORT}`);
});
