     // Enhanced Parking Management System with Spot Assignment
        class ParkingManager {
            constructor() {
                this.vehicles = this.loadData() || [];
                this.totalSpots = 100;
                this.occupiedSpots = new Set(this.vehicles.filter(v => v.status === 'Parked').map(v => v.spotId));
                this.initializeParkingGrid();
                this.updateDisplay();
                this.setCurrentDateTime();
            }

            loadData() {
                try {
                    const data = localStorage.getItem('parkingVehicles');
                    return data ? JSON.parse(data) : [];
                } catch (error) {
                    console.error('Error loading data:', error);
                    return [];
                }
            }

            initializeParkingGrid() {
                const parkingGrid = document.getElementById('parkingGrid');
                parkingGrid.innerHTML = '';
                
                // Create 100 parking spots in a 10x10 grid
                for (let i = 1; i <= this.totalSpots; i++) {
                    const spot = document.createElement('div');
                    spot.className = 'parking-spot';
                    spot.setAttribute('data-spot', i);
                    spot.innerHTML = `<span class="spot-number">${i}</span>`;
                    
                    // Check if spot is occupied
                    if (this.occupiedSpots.has(i)) {
                        spot.classList.add('occupied');
                        // Find vehicle in this spot
                        const vehicle = this.vehicles.find(v => v.spotId === i && v.status === 'Parked');
                        if (vehicle) {
                            spot.title = `Spot ${i} - ${vehicle.vehicleNumber} (${vehicle.ownerName})`;
                        }
                    } else {
                        spot.classList.add('available');
                        spot.title = `Spot ${i} - Available`;
                    }
                    
                    parkingGrid.appendChild(spot);
                }
            }

            getNextAvailableSpot() {
                for (let i = 1; i <= this.totalSpots; i++) {
                    if (!this.occupiedSpots.has(i)) {
                        return i;
                    }
                }
                return null; // No spots available
            }

            addVehicle(vehicleData) {
                // Check if parking is full
                if (this.occupiedSpots.size >= this.totalSpots) {
                    this.showAlert('Parking is full! No available spots.', 'danger');
                    return false;
                }

                // Check for duplicate vehicle numbers
                const existingVehicle = this.vehicles.find(v => 
                    v.vehicleNumber.toLowerCase() === vehicleData.vehicleNumber.toLowerCase() && 
                    v.status === 'Parked'
                );
                
                if (existingVehicle) {
                    this.showAlert(`This vehicle is already parked in Spot #${existingVehicle.spotId}!`, 'warning');
                    return false;
                }

                // Assign parking spot
                const spotId = this.getNextAvailableSpot();
                if (!spotId) {
                    this.showAlert('No available parking spots!', 'danger');
                    return false;
                }

                // Generate unique ID
                const id = Date.now().toString();
                
                // Create vehicle object with spot assignment
                const vehicle = {
                    id: id,
                    spotId: spotId,
                    ownerName: vehicleData.ownerName,
                    vehicleName: vehicleData.vehicleName,
                    vehicleNumber: vehicleData.vehicleNumber.toUpperCase(),
                    entryDate: vehicleData.entryDate,
                    exitDate: vehicleData.exitDate || null,
                    status: vehicleData.exitDate ? 'Exited' : 'Parked'
                };

                this.vehicles.push(vehicle);
                
                // Update occupied spots if vehicle is parked
                if (vehicle.status === 'Parked') {
                    this.occupiedSpots.add(spotId);
                }
                
                this.saveData();
                this.updateDisplay();
                this.showAlert(`Vehicle successfully registered! Assigned to Spot #${spotId}`, 'success');
                return true;
            }

            markVehicleExit(vehicleId, exitTime) {
                const vehicle = this.vehicles.find(v => v.id === vehicleId);
                if (vehicle) {
                    vehicle.exitDate = exitTime;
                    vehicle.status = 'Exited';
                    
                    // Free up the parking spot
                    this.occupiedSpots.delete(vehicle.spotId);
                    
                    this.saveData();
                    this.updateDisplay();
                    this.showAlert(`Vehicle ${vehicle.vehicleNumber} has exited from Spot #${vehicle.spotId}`, 'info');
                }
            }

            deleteVehicle(vehicleId) {
                const vehicleIndex = this.vehicles.findIndex(v => v.id === vehicleId);
                if (vehicleIndex > -1) {
                    const vehicle = this.vehicles[vehicleIndex];
                    
                    // Free up parking spot if vehicle was parked
                    if (vehicle.status === 'Parked') {
                        this.occupiedSpots.delete(vehicle.spotId);
                    }
                    
                    this.vehicles.splice(vehicleIndex, 1);
                    this.saveData();
                    this.updateDisplay();
                    this.showAlert(`Vehicle record deleted successfully!`, 'success');
                }
            }

            updateDisplay() {
                this.updateStats();
                this.updateVehicleTable();
                this.initializeParkingGrid(); // Refresh parking grid
            }

            updateStats() {
                const totalVehicles = this.vehicles.length;
                const parkedVehicles = this.vehicles.filter(v => v.status === 'Parked').length;
                const exitedToday = this.vehicles.filter(v => {
                    if (!v.exitDate) return false;
                    const exitDate = new Date(v.exitDate);
                    const today = new Date();
                    return exitDate.toDateString() === today.toDateString();
                }).length;
                const availableSpots = this.totalSpots - parkedVehicles;

                document.getElementById('totalVehicles').textContent = totalVehicles;
                document.getElementById('parkedVehicles').textContent = parkedVehicles;
                document.getElementById('exitedVehicles').textContent = exitedToday;
                document.getElementById('availableSpots').textContent = availableSpots;
            }

            updateVehicleTable() {
                const tbody = document.getElementById('vehicleTableBody');
                tbody.innerHTML = '';

                const filteredVehicles = this.getFilteredVehicles();

                if (filteredVehicles.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center text-muted py-4">
                                <i class="fas fa-inbox fa-2x mb-2"></i><br>
                                No vehicles found
                            </td>
                        </tr>
                    `;
                    return;
                }

                filteredVehicles.forEach(vehicle => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="fw-medium">${vehicle.ownerName}</td>
                        <td>${vehicle.vehicleName}</td>
                        <td class="font-monospace fw-bold">${vehicle.vehicleNumber}</td>
                        <td>
                            <small class="text-muted d-block">Spot #${vehicle.spotId}</small>
                            ${this.formatDateTime(vehicle.entryDate)}
                        </td>
                        <td>${vehicle.exitDate ? this.formatDateTime(vehicle.exitDate) : '<span class="text-muted">-</span>'}</td>
                        <td>
                            <span class="badge ${vehicle.status === 'Parked' ? 'bg-success' : 'bg-secondary'}">
                                ${vehicle.status}
                            </span>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                ${vehicle.status === 'Parked' ? 
                                    `<button class="btn btn-outline-warning" onclick="showExitModal('${vehicle.id}')" title="Mark Exit">
                                        <i class="fas fa-sign-out-alt"></i>
                                    </button>` : ''
                                }
                                <button class="btn btn-outline-danger" onclick="deleteVehicleRecord('${vehicle.id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }

            getFilteredVehicles() {
                let filtered = [...this.vehicles];
                
                // Apply search filter
                const searchTerm = document.getElementById('searchInput').value.toLowerCase();
                if (searchTerm) {
                    filtered = filtered.filter(vehicle => 
                        vehicle.ownerName.toLowerCase().includes(searchTerm) ||
                        vehicle.vehicleName.toLowerCase().includes(searchTerm) ||
                        vehicle.vehicleNumber.toLowerCase().includes(searchTerm)
                    );
                }
                
                // Apply status filter
                const statusFilter = document.getElementById('statusFilter').value;
                if (statusFilter) {
                    filtered = filtered.filter(vehicle => vehicle.status === statusFilter);
                }
                
                // Sort by entry date (newest first)
                filtered.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
                
                return filtered;
            }

            formatDateTime(dateTimeString) {
                const date = new Date(dateTimeString);
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            setCurrentDateTime() {
                const now = new Date();
                const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                    .toISOString().slice(0, 16);
                document.getElementById('entryDate').value = localDateTime;
            }

            showAlert(message, type) {
                const alertContainer = document.getElementById('alertContainer');
                const alertId = 'alert-' + Date.now();
                
                const alertHTML = `
                    <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                        <i class="fas ${this.getAlertIcon(type)} me-2"></i>
                        ${message}
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                `;
                
                alertContainer.innerHTML = alertHTML;
                
                // Auto-dismiss after 5 seconds
                setTimeout(() => {
                    const alertElement = document.getElementById(alertId);
                    if (alertElement) {
                        const alert = new bootstrap.Alert(alertElement);
                        alert.close();
                    }
                }, 5000);
            }

            getAlertIcon(type) {
                const icons = {
                    success: 'fa-check-circle',
                    danger: 'fa-exclamation-triangle',
                    warning: 'fa-exclamation-circle',
                    info: 'fa-info-circle'
                };
                return icons[type] || 'fa-info-circle';
            }

            saveData() {
                try {
                    localStorage.setItem('parkingVehicles', JSON.stringify(this.vehicles));
                } catch (error) {
                    console.error('Error saving data:', error);
                    this.showAlert('Error saving data to local storage!', 'danger');
                }
            }

            exportData() {
                if (this.vehicles.length === 0) {
                    this.showAlert('No data to export!', 'warning');
                    return;
                }

                const csvContent = this.convertToCSV(this.vehicles);
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `parking_records_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showAlert('Data exported successfully!', 'success');
            }

            convertToCSV(data) {
                const headers = ['Spot ID', 'Owner Name', 'Vehicle Name', 'Vehicle Number', 'Entry Date', 'Exit Date', 'Status'];
                const csvRows = [headers.join(',')];
                
                data.forEach(vehicle => {
                    const row = [
                        vehicle.spotId,
                        `"${vehicle.ownerName}"`,
                        `"${vehicle.vehicleName}"`,
                        vehicle.vehicleNumber,
                        vehicle.entryDate,
                        vehicle.exitDate || '',
                        vehicle.status
                    ];
                    csvRows.push(row.join(','));
                });
                
                return csvRows.join('\n');
            }

            clearAllData() {
                if (confirm('Are you sure you want to clear all vehicle records? This action cannot be undone.')) {
                    this.vehicles = [];
                    this.occupiedSpots.clear();
                    this.saveData();
                    this.updateDisplay();
                    this.showAlert('All vehicle records have been cleared!', 'info');
                }
            }
        }

        // Initialize parking manager
        const parkingManager = new ParkingManager();

        // Form handling
        document.getElementById('vehicleForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!this.checkValidity()) {
                e.stopPropagation();
                this.classList.add('was-validated');
                return;
            }
            
            const formData = {
                ownerName: document.getElementById('ownerName').value.trim(),
                vehicleName: document.getElementById('vehicleName').value.trim(),
                vehicleNumber: document.getElementById('vehicleNumber').value.trim(),
                entryDate: document.getElementById('entryDate').value,
                exitDate: document.getElementById('exitDate').value
            };
            
            if (parkingManager.addVehicle(formData)) {
                clearForm();
                this.classList.remove('was-validated');
            }
        });

        // Modal handling for exit time
        let currentVehicleId = null;

        function showExitModal(vehicleId) {
            currentVehicleId = vehicleId;
            const now = new Date();
            const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
            document.getElementById('modalExitTime').value = localDateTime;
            
            const modal = new bootstrap.Modal(document.getElementById('exitTimeModal'));
            modal.show();
        }

        function confirmExit() {
            const exitTime = document.getElementById('modalExitTime').value;
            if (exitTime && currentVehicleId) {
                parkingManager.markVehicleExit(currentVehicleId, exitTime);
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('exitTimeModal'));
                modal.hide();
                currentVehicleId = null;
            }
        }

        // Utility functions
        function clearForm() {
            document.getElementById('vehicleForm').reset();
            document.getElementById('vehicleForm').classList.remove('was-validated');
            parkingManager.setCurrentDateTime();
        }

        function deleteVehicleRecord(vehicleId) {
            if (confirm('Are you sure you want to delete this vehicle record?')) {
                parkingManager.deleteVehicle(vehicleId);
            }
        }

        function searchVehicles() {
            parkingManager.updateVehicleTable();
        }

        function filterByStatus() {
            parkingManager.updateVehicleTable();
        }

        // Auto-uppercase vehicle number input
        document.getElementById('vehicleNumber').addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
