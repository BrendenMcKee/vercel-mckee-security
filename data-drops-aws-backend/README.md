# Network Run Confirmation API
Backend server for McKee Security's Network Run Confirmation system.

## Technical Details
- Node.js Express server
- MySQL database with connection pooling
- AWS Elastic Beanstalk deployment
- ES Modules architecture
- CORS configuration for secure cross-origin requests
- SSL/TLS encryption for database connections

## Features
- RESTful API endpoints for:
  - Site Locations management (CRUD)
  - Network Run tracking and confirmations
- Secure database operations
- Error handling and logging
- Environment-based configuration

## Requirements
- Node.js >= 22.13.1
- MySQL >= 8.0
- AWS Account with:
  - Elastic Beanstalk
  - RDS (MySQL)
  - IAM roles configured

## Environment Variables
RDS_ENDPOINT=your-db-instance.region.rds.amazonaws.com
RDS_USERNAME=your_username
RDS_PASSWORD=your_password
RDS_DB_NAME=your_database_name
PORT=3000 (optional, defaults to 3000)

## Project Structure
project/
├── app.js # Application entry point
├── controllers/ # Route controllers
├── routes/ # API routes
├── certs/ # SSL certificates
└── .ebextensions/ # Elastic Beanstalk configuration


## API Endpoints

### Sites
- `GET /api/sites` - Get all sites
- `GET /api/sites/:id` - Get specific site
- `POST /api/sites` - Create new site
- `PUT /api/sites/:id` - Update site
- `DELETE /api/sites/:id` - Delete site

### Network Runs
- `GET /api/network-runs` - Get all network runs
- `GET /api/network-runs/:id` - Get specific network run
- `POST /api/network-runs` - Create new network run
- `PUT /api/network-runs/:id` - Update network run
- `DELETE /api/network-runs/:id` - Delete network run

## Development Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables
4. Download SSL certificate for RDS
5. Start development server:
   ```bash
   node app.js
   ```

## Deployment
1. Configure Elastic Beanstalk environment
2. Set up RDS instance
3. Configure security groups
4. Deploy using EB CLI or AWS Console
5. Verify SSL certificate installation

## Contributing (Internal Use Only)
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Security
- SSL/TLS encryption for database connections
- CORS policy configuration
- Environment variable management
- No sensitive data in version control

## License
MIT

## Author
Brenden McKee

## Support
For internal support, contact the development team.