require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

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
        const { message, image, history } = req.body;
        const msgLower = (message || "").toLowerCase();

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'Geen OPENAI_API_KEY ingesteld in .env bestand op de server.' });
        }

        // --- Handle Image Restyling (If image is present and user asks for style) ---
        const isRestyleRequest = image && (msgLower.includes('stijl van het bedrijf') || msgLower.includes('restyle') || msgLower.includes('huisstijl'));

        if (isRestyleRequest) {
            // Step 1: Use GPT-4o to describe the image
            const visionResponse = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: "Beschrijf deze afbeelding zeer gedetailleerd zodat ik deze beschrijving kan gebruiken om een nieuwe versie ervan te genereren. Focus op de compositie, objecten en sfeer, maar negeer de huidige kleuren en stijl." },
                            { type: 'image_url', image_url: { url: image } }
                        ]
                    }
                ]
            });

            const imageDescription = visionResponse.choices[0].message.content;

            // Step 2: Use description to generate new branded image
            const stylePrompt = " | STYLE: Modern, professional agency aesthetic. Use vibrant gradients and lighting with these brand colors: deep navy purple (#150b49), vibrant purple (#5633f7), coral/pink (#fc5441), and cyan (#4CD0E1). " +
                                " | LOGO WATERMARK: In a corner of the image, place a small, minimalist, flat white digital watermark. The logo consists of two upward-pointing chevrons (like an abstract 'A') stacked one above the other. " +
                                " | NO OTHER TEXT allowed in the image.";

            const imageResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: `Een professionele grafische herinterpretatie van het volgende: ${imageDescription} ${stylePrompt}`,
                n: 1,
                size: "1024x1024"
            });

            const imageUrl = imageResponse.data[0].url;
            return res.json({ response: `Ik heb je afbeelding geanalyseerd en opnieuw ontworpen in de stijl van De Graphics:\n\n![Gerestylde Afbeelding](${imageUrl})` });
        }

        // --- Handle Normal Image Generation ---
        if (msgLower.includes('genereer een plaatje') || 
            msgLower.includes('maak een plaatje') || 
            msgLower.includes('generate an image') ||
            msgLower.includes('maak een afbeelding') ||
            msgLower.includes('genereer een afbeelding') ||
            msgLower.includes('teken een') ||
            msgLower.includes('ontwerp een plaatje')) {
            
            // Combined style prompt: Company Gradients + Small White Watermark Logo
            const stylePrompt = " | STYLE: Modern, professional agency aesthetic. Use vibrant gradients and lighting with these brand colors: deep navy purple (#150b49), vibrant purple (#5633f7), coral/pink (#fc5441), and cyan (#4CD0E1). " +
                                " | LOGO WATERMARK: In a corner of the image, place a small, minimalist, flat white digital watermark. The logo consists of two upward-pointing chevrons (like an abstract 'A') stacked one above the other. " +
                                " | NO OTHER TEXT allowed in the image.";
                                
            const finalImagePrompt = message + stylePrompt;

            const imageResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: finalImagePrompt,
                n: 1,
                size: "1024x1024"
            });
            const imageUrl = imageResponse.data[0].url;
            return res.json({ response: `Hier is de afbeelding in de stijl van De Graphics die ik voor je heb gemaakt:\n\n![Gegenereerde Afbeelding](${imageUrl})` });
        }

        // --- Handle Normal Chat & Vision ---
        let messages = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];

        // Add history if present
        if (history && Array.isArray(history)) {
            messages.push(...history);
        }

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

        console.log('Sending to OpenAI:', JSON.stringify(messages, null, 2));

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
