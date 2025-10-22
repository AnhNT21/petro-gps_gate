# GPGate - Vehicle Tracking & Management System

A real-time vehicle tracking and management system that monitors vehicle locations, manages check-ins/check-outs at stations, and provides a web portal for visualization. The system acts as a WebSocket proxy between upstream GPS tracking services and downstream clients.

## 🚀 Features

-   **Real-time Vehicle Tracking**: Monitors vehicle locations via WebSocket connections
-   **Station Management**: Automatic check-in/check-out detection when vehicles enter/exit station boundaries
-   **Video Capture**: Integrated RTSP camera support for vehicle entry/exit recording
-   **Web Portal**: React-based dashboard for real-time vehicle monitoring
-   **Database Integration**: Supabase backend for data persistence
-   **WebSocket Proxy**: Bridges upstream GPS data to downstream clients

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Upstream      │    │   GPGate        │    │   Downstream    │
│   GPS Service   │───▶│   Proxy Server  │───▶│   Web Clients   │
│   (WebSocket)   │    │                 │    │   (Socket.IO)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Supabase      │
                       │   Database      │
                       └─────────────────┘
```

## 📁 Project Structure

```
src/
├── app.js                 # Express.js application setup
├── server.js              # HTTP server and WebSocket initialization
├── config/
│   ├── index.js           # Configuration constants and settings
│   └── upstream.json      # Upstream connection credentials
├── ws/
│   ├── upstream/          # Upstream WebSocket connection handling
│   │   └── index.js       # GPS data ingestion and authentication
│   └── downstream/        # Downstream Socket.IO server
│       └── index.js       # Client connection management
├── processor/
│   └── vehicle.js         # Vehicle location processing and check-in/out logic
├── database/
│   └── supabase.js        # Database operations and queries
├── portal/                # React web application (built)
│   ├── index.html         # Main HTML file
│   └── static/            # Static assets
└── ultils/                # Utility functions
```

## 📂 Folder and File Brief

### Root Directory Files

-   **`package.json`** - Node.js project configuration, dependencies, and scripts
-   **`package-lock.json`** - Dependency lock file for consistent installations
-   **`tsconfig.json`** - TypeScript configuration (used for type checking)
-   **`README.md`** - Project documentation and setup guide

### `src/` - Main Source Code Directory

#### Core Application Files

-   **`app.js`** - Express.js application setup with routes, middleware, and Supabase integration

    -   Configures Express server with static file serving
    -   Sets up API endpoints (`/entries` for database queries)
    -   Serves React portal application under `/portal` route
    -   Integrates Supabase client for database operations

-   **`server.js`** - Main server entry point
    -   Creates HTTP server from Express app
    -   Initializes upstream WebSocket connection
    -   Starts downstream Socket.IO server
    -   Handles server startup and port configuration

#### `config/` - Configuration Management

-   **`index.js`** - Central configuration file containing:

    -   Upstream WebSocket connection settings
    -   Vehicle tracking IDs (`sgn_vehicles`)
    -   Station coordinates and metadata (`sgn_stations`)
    -   RTSP camera URLs for video capture
    -   Authentication credentials and tokens
    -   Sample entry data for testing

-   **`upstream.json`** - External configuration for upstream service credentials
    -   Stores authentication tokens and PIDs
    -   Allows runtime credential updates without code changes

#### `ws/` - WebSocket Communication Layer

##### `upstream/` - GPS Data Ingestion

-   **`index.js`** - Upstream WebSocket connection manager
    -   Establishes connection to GPS tracking service
    -   Handles authentication and re-authentication
    -   Manages keep-alive messages
    -   Processes incoming GPS data and forwards to vehicle processor
    -   Implements error handling and connection recovery

##### `downstream/` - Client Communication

-   **`index.js`** - Socket.IO server for client connections
    -   Manages client connections and disconnections
    -   Broadcasts vehicle location updates to all connected clients
    -   Emits vehicle entry/exit data to web portal
    -   Handles CORS configuration for cross-origin requests

#### `processor/` - Business Logic Processing

-   **`vehicle.js`** - Core vehicle tracking and station management logic
    -   Processes GPS location data from upstream
    -   Calculates distance between vehicles and stations
    -   Determines check-in/check-out events based on proximity
    -   Manages debouncing to prevent duplicate events
    -   Triggers video capture on vehicle entry/exit
    -   Updates database with entry/exit records

#### `database/` - Data Persistence Layer

-   **`supabase.js`** - Database operations and queries
    -   CRUD operations for vehicle entries
    -   Fetches recent entries for real-time updates
    -   Handles database connection and error management
    -   Provides data access layer for vehicle tracking system

#### `portal/` - Web Application Frontend

-   **`index.html`** - Main HTML file for React application
-   **`static/`** - Compiled React application assets
-   **`asset-manifest.json`** - React build manifest file
-   **`manifest.json`** - PWA manifest for mobile app functionality
-   **`robots.txt`** - Search engine crawling configuration
-   **`favicon.ico`** - Browser tab icon
-   **`logo192.png`** & **`logo512.png`** - Application logos for PWA

#### `AppUI/` - Portal Source (React)

-   React application source code used to build the portal served by the backend.
-   Run `npm start` inside this directory to develop the UI with the Create React App dev server.
-   When portal changes are ready, run `npm run build`; the script clears `src/portal/`, copies the compiled assets there, and the Node.js service will serve them at `/portal`.

#### `ultils/` - Utility Functions

-   **`index.js`** - Common utility functions
    -   `getDistanceMeters()` - Calculates distance between two GPS coordinates using Haversine formula
    -   `delay()` - Promise-based delay function for async operations

### Build and Distribution

-   **`dist/`** - TypeScript compilation output directory
-   **`node_modules/`** - Node.js dependencies (auto-generated)

### Configuration and Environment

-   **`.env`** - Environment variables (not in repo, must be created)
    -   Database connection strings
    -   API keys and secrets
    -   Server configuration
    -   Upstream service credentials

## 🛠️ Technology Stack

-   **Backend**: Node.js, Express.js
-   **WebSockets**: `ws` (upstream), Socket.IO (downstream)
-   **Database**: Supabase (PostgreSQL)
-   **Frontend**: React (built and served statically)
-   **Real-time Communication**: WebSocket, Socket.IO
-   **Video**: RTSP camera integration
-   **Configuration**: Environment variables, JSON config files

## 📋 Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn
-   Supabase account and project
-   RTSP cameras (optional)
-   Upstream GPS service credentials

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd GPgate
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and fill in the required values:

```env
# Server Configuration
PORT=3000

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Upstream Configuration (managed automatically but required on first run)
UPSTREAM_SOCKET_URL=ws://your.domain.com:8080/ws
UPSTREAM_USERNAME=admin
UPSTREAM_PASSWORD=your_password

# Camera Configuration
RTSP_CAM_IN=rtsp://user:password@camera-in/stream
RTSP_CAM_OUT=rtsp://user:password@camera-out/stream
```

### 4. Database Setup

Ensure your Supabase database has an `entries` table with the following schema:

```sql
CREATE TABLE entries (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(50) NOT NULL,
    station VARCHAR(10) NOT NULL,
    in_time TIMESTAMP,
    out_time TIMESTAMP,
    isInside BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Configuration Files

`src/config/upstream.json` is generated by the service; credentials are persisted automatically and do not need manual edits.

## 🚀 Running the Application

### Development Mode

```bash
npm start
```

This will start the server with nodemon for automatic reloading.

### Production Mode

```bash
node src/server.js
```

The server will start on the configured port (default: 3000).

## 📡 API Endpoints

### HTTP Endpoints

-   `GET /` - Health check endpoint
-   `GET /entries` - Fetch all vehicle entries from database
-   `GET /portal/*` - Serve the React web application

### WebSocket Events

#### Downstream (Client → Server)

-   `connection` - Client connects to the server
-   `disconnect` - Client disconnects from the server

#### Downstream (Server → Client)

-   `newLocation` - Real-time vehicle location updates
-   `vehicleEntries` - Vehicle entry/exit data updates

## 🔧 Configuration

### Vehicle Configuration

Edit `src/config/index.js` to configure:

-   **Vehicle IDs**: `sgn_vehicles` array
-   **Station Coordinates**: `sgn_stations` array
-   **RTSP Camera URLs**: `rtsp_cam_in` and `rtsp_cam_out`

### Station Setup

Add new stations to the `sgn_stations` array:

```javascript
export const sgn_stations = [
    {
        STATION_CODE: {
            name: 'Station Name',
            latitude: '10.820397678344829',
            longitude: '106.67308348033158',
        },
    },
];
```

## 📊 Monitoring & Logs

The application provides comprehensive logging:

-   **Connection Status**: Upstream/downstream WebSocket connections
-   **Vehicle Events**: Check-ins, check-outs, and location updates
-   **Error Handling**: Authentication failures, connection errors
-   **Performance**: Response times and data processing metrics

## 🔒 Security Considerations

-   Store sensitive credentials in environment variables
-   Use Supabase Row Level Security (RLS) for database access
-   Implement proper authentication for the web portal
-   Secure WebSocket connections with proper CORS configuration

## 🐛 Troubleshooting

### Common Issues

1. **Upstream Connection Failed**

    - Confirm the service has generated credentials in `src/config/upstream.json` (auto-managed)
    - Verify upstream service availability
    - Check network connectivity

2. **Database Connection Issues**

    - Verify Supabase credentials in `.env`
    - Check database table schema
    - Ensure proper permissions

3. **WebSocket Connection Problems**
    - Check CORS configuration
    - Verify client connection URLs
    - Check firewall settings
