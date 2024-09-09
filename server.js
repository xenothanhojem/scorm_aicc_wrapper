const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');

// Load dotenv for local development, ignore in production
try {
    require('dotenv').config();
} catch (error) {
    console.log('dotenv not found, using process.env');
}

const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aicc_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Get AICC_URL from environment variable
const AICC_URL = process.env.AICC_URL || 'http://localhost:3000';

// Initialize database
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                student_id VARCHAR(255),
                student_name VARCHAR(255),
                lesson_location VARCHAR(255),
                credit VARCHAR(50),
                lesson_status VARCHAR(50),
                score VARCHAR(50),
                session_time VARCHAR(50),
                lesson_mode VARCHAR(50),
                course_id VARCHAR(255),
                mastery_score VARCHAR(50),
                source_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Database initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

initDatabase();

// Default route to serve the upload form
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AICC to SCORM Converter</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
                h1 { color: #333; }
                form { margin-top: 20px; }
                input[type="file"] { margin-bottom: 10px; }
                button { background-color: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }
                button:hover { background-color: #45a049; }
            </style>
        </head>
        <body>
            <h1>AICC to SCORM Converter</h1>
            <p>Upload your AICC zip package to convert it to a SCORM-compatible package.</p>
            <form action="/create-scorm-package" method="post" enctype="multipart/form-data">
                <input type="file" name="aiccZip" accept=".zip" required>
                <button type="submit">Create SCORM Package</button>
            </form>
        </body>
        </html>
    `);
});

// Function to process AICC zip and create SCORM package
app.post('/create-scorm-package', upload.single('aiccZip'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const workDir = path.join(__dirname, 'temp', uuidv4());
    fs.mkdirSync(workDir, { recursive: true });

    try {
        // Extract AICC zip
        const aiccZip = new AdmZip(req.file.path);
        aiccZip.extractAllTo(workDir, true);

        // Find .au and .des files
        const auFile = fs.readdirSync(workDir).find(file => file.endsWith('.au'));
        const desFile = fs.readdirSync(workDir).find(file => file.endsWith('.des'));

        if (!auFile || !desFile) {
            throw new Error('Required .au or .des file not found');
        }

        // Read .au and .des files
        const auContent = fs.readFileSync(path.join(workDir, auFile), 'utf8');
        const desContent = fs.readFileSync(path.join(workDir, desFile), 'utf8');

        // Parse .au file
        const auLines = auContent.trim().split('\n');
        const auHeaders = auLines[0].replace(/"/g, '').split(',');
        const auValues = auLines[1].replace(/"/g, '').split(',');
        const auConfig = auHeaders.reduce((obj, header, index) => {
            obj[header] = auValues[index];
            return obj;
        }, {});

        // Parse .des file
        const desLines = desContent.trim().split('\n');
        const desHeaders = desLines[0].replace(/"/g, '').split(',');
        const desValues = desLines[1].replace(/"/g, '').split(',');
        const desConfig = desHeaders.reduce((obj, header, index) => {
            obj[header] = desValues[index];
            return obj;
        }, {});

        // Create config.json
        const config = {
            "AICC_URL": AICC_URL
        };
        fs.writeFileSync(path.join(workDir, 'config.json'), JSON.stringify(config, null, 2));

        // Copy launch.html and scorm_api.js
        fs.copyFileSync(path.join(__dirname, 'launch.html'), path.join(workDir, 'launch.html'));
        fs.copyFileSync(path.join(__dirname, 'scorm_api.js'), path.join(workDir, 'scorm_api.js'));

        // Create aicc directory and move AICC files
        const aiccDir = path.join(workDir, 'aicc');
        if (!fs.existsSync(aiccDir)) {
            fs.mkdirSync(aiccDir);
        }

        fs.readdirSync(workDir).forEach(file => {
            if (file !== 'launch.html' && file !== 'scorm_api.js' && file !== 'config.json' && file !== 'aicc') {
                const sourcePath = path.join(workDir, file);
                const destPath = path.join(aiccDir, file);
                fs.renameSync(sourcePath, destPath);
            }
        });

        // Zip the AICC files
        const aiccCourseZip = new AdmZip();
        fs.readdirSync(aiccDir).forEach(file => {
            const filePath = path.join(aiccDir, file);
            aiccCourseZip.addLocalFile(filePath);
        });
        aiccCourseZip.writeZip(path.join(aiccDir, 'course.zip'));

        // Remove original AICC files from aicc directory
        fs.readdirSync(aiccDir).forEach(file => {
            if (file !== 'course.zip') {
                fs.unlinkSync(path.join(aiccDir, file));
            }
        });

        // Create imsmanifest.xml
        const manifestContent = `
<?xml version="1.0" standalone="no" ?>
<manifest identifier="com.scorm.manifesttemplates.scorm12" version="1"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>${desConfig.Title}</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>${desConfig.Title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="launch.html">
      <file href="launch.html"/>
      <file href="scorm_api.js"/>
      <file href="config.json"/>
      <file href="aicc/course.zip"/>
    </resource>
  </resources>
</manifest>
        `;
        fs.writeFileSync(path.join(workDir, 'imsmanifest.xml'), manifestContent.trim());

        // Create new zip file
        const scormZip = new AdmZip();
        const scormFiles = fs.readdirSync(workDir);
        scormFiles.forEach(file => {
            if (file === 'aicc') {
                scormZip.addLocalFolder(path.join(workDir, 'aicc'), 'aicc');
            } else {
                scormZip.addLocalFile(path.join(workDir, file));
            }
        });

        const outputPath = path.join(__dirname, 'scorm_packages', `${desConfig.Title.replace(/\s+/g, '_')}_SCORM.zip`);
        scormZip.writeZip(outputPath);

        // Send the file
        res.download(outputPath, () => {
            // Clean up
            fs.unlinkSync(req.file.path);
            fs.rmSync(workDir, { recursive: true, force: true });
            fs.unlinkSync(outputPath);
        });

    } catch (error) {
        console.error('Error creating SCORM package:', error);
        res.status(500).send('Error creating SCORM package: ' + error.message);
        // Clean up
        fs.unlinkSync(req.file.path);
        fs.rmSync(workDir, { recursive: true, force: true });
    }
});

// New endpoint to store session data
app.post('/store-session-data', async (req, res) => {
    const { session_id, source_url, ...sessionData } = req.body;
    
    if (!session_id) {
        return res.status(400).send('Session ID is required');
    }

    try {
        const query = `
            INSERT INTO sessions (session_id, student_id, student_name, lesson_location, credit, lesson_status, score, session_time, lesson_mode, course_id, mastery_score, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            student_id = VALUES(student_id),
            student_name = VALUES(student_name),
            lesson_location = VALUES(lesson_location),
            credit = VALUES(credit),
            lesson_status = VALUES(lesson_status),
            score = VALUES(score),
            session_time = VALUES(session_time),
            lesson_mode = VALUES(lesson_mode),
            course_id = VALUES(course_id),
            mastery_score = VALUES(mastery_score),
            source_url = VALUES(source_url)
        `;
        
        await pool.query(query, [
            session_id,
            sessionData.student_id,
            sessionData.student_name,
            sessionData.lesson_location,
            sessionData.credit,
            sessionData.lesson_status,
            sessionData.score,
            sessionData.session_time,
            sessionData.lesson_mode,
            sessionData.course_id,
            sessionData.mastery_score,
            source_url
        ]);
        
        res.send('Session data stored successfully');
    } catch (error) {
        console.error('Error storing session data:', error);
        res.status(500).send('Error storing session data');
    }
});

// Updated getparam endpoint
app.post('/aicc-webhook', async (req, res) => {
    console.log('Received AICC command:', req.body);
    const command = req.body.command ? req.body.command.toLowerCase() : '';

    switch (command) {
        case 'getparam':
            try {
                const [rows] = await pool.query('SELECT * FROM sessions WHERE session_id = ?', [req.body.session_id]);
                const sessionData = rows[0] || {};

                // Constructing GetParam response using stored session data
                res.send(`error=0
error_text=Successful
aicc_data=
[Core]
Student_ID=${sessionData.student_id || ''}
Student_Name=${sessionData.student_name || ''}
Lesson_Location=${sessionData.lesson_location || ''}
Credit=${sessionData.credit || ''}
Lesson_Status=${sessionData.lesson_status || ''}
Score=${sessionData.score || ''}
Time=${sessionData.session_time || ''}
Lesson_Mode=${sessionData.lesson_mode || ''}
[Core_Lesson]
[Core_Vendor]
[Evaluation]
Course_ID=${sessionData.course_id || ''}
[Student_Data]
Mastery_Score=${sessionData.mastery_score || ''}`);
            } catch (error) {
                console.error('Error reading session data:', error);
                res.status(500).send('Error retrieving session data');
            }
            break;
        case 'putparam':
            console.log('Saving AICC data:', req.body);
            res.send('AICC_RESULT=OK');
            break;
        case 'putinteractions':
            console.log('Saving interaction data:', req.body);
            res.send('AICC_RESULT=OK');
            break;
        case 'exitau':
            console.log('Student exited the course');
            res.send('AICC_RESULT=OK');
            break;
        default:
            res.status(400).send('AICC_RESULT=ERROR\nERROR_MESSAGE=Unknown command');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AICC webhook server running on port ${PORT}`));