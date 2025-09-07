#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Cosmos Intranet System
Tests authentication, user management, resources, and reservation system
"""

import requests
import json
import time
from datetime import datetime, timedelta
import os

# Configuration
BASE_URL = "http://localhost:3000/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"

class CosmosIntranetTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        self.test_reservation_id = None
        self.resources = []
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_result(self, test_name, success, message=""):
        """Log test results"""
        if success:
            print(f"✅ {test_name}: PASSED {message}")
            self.results["passed"] += 1
        else:
            print(f"❌ {test_name}: FAILED {message}")
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")

    def test_database_initialization(self):
        """Test database initialization by attempting to login with default admin"""
        print("\n=== Testing Database Initialization ===")
        
        try:
            # Test admin user creation by attempting login
            response = requests.post(f"{BASE_URL}/auth/login", 
                                   json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                                   timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.admin_token = data["token"]
                    self.log_result("Database Init - Default admin user", True, 
                                  f"Admin user exists and can login. Role: {data['user']['role']}")
                else:
                    self.log_result("Database Init - Default admin user", False, 
                                  "Login successful but missing token or user data")
            else:
                self.log_result("Database Init - Default admin user", False, 
                              f"Admin login failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("Database Init - Default admin user", False, f"Exception: {str(e)}")

    def test_authentication_system(self):
        """Test authentication system comprehensively"""
        print("\n=== Testing Authentication System ===")
        
        # Test 1: Valid admin login
        try:
            response = requests.post(f"{BASE_URL}/auth/login", 
                                   json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                                   timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and data["user"]["role"] == "admin":
                    self.admin_token = data["token"]
                    self.log_result("Auth - Admin login", True, "Admin login successful with valid token")
                else:
                    self.log_result("Auth - Admin login", False, "Missing token or incorrect role")
            else:
                self.log_result("Auth - Admin login", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Auth - Admin login", False, f"Exception: {str(e)}")

        # Test 2: Invalid credentials
        try:
            response = requests.post(f"{BASE_URL}/auth/login", 
                                   json={"username": "invalid", "password": "wrong"},
                                   timeout=10)
            
            if response.status_code == 401:
                self.log_result("Auth - Invalid credentials", True, "Correctly rejected invalid credentials")
            else:
                self.log_result("Auth - Invalid credentials", False, 
                              f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Auth - Invalid credentials", False, f"Exception: {str(e)}")

        # Test 3: JWT token validation
        if self.admin_token:
            try:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                response = requests.get(f"{BASE_URL}/auth/profile", headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if "username" in data and data["username"] == ADMIN_USERNAME:
                        self.log_result("Auth - JWT validation", True, "JWT token validated successfully")
                    else:
                        self.log_result("Auth - JWT validation", False, "Invalid profile data returned")
                else:
                    self.log_result("Auth - JWT validation", False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_result("Auth - JWT validation", False, f"Exception: {str(e)}")

        # Test 4: Invalid JWT token
        try:
            headers = {"Authorization": "Bearer invalid_token"}
            response = requests.get(f"{BASE_URL}/auth/profile", headers=headers, timeout=10)
            
            if response.status_code == 401:
                self.log_result("Auth - Invalid JWT", True, "Correctly rejected invalid JWT token")
            else:
                self.log_result("Auth - Invalid JWT", False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Auth - Invalid JWT", False, f"Exception: {str(e)}")

    def test_resources_management(self):
        """Test resources management"""
        print("\n=== Testing Resources Management ===")
        
        if not self.admin_token:
            self.log_result("Resources - Fetch resources", False, "No admin token available")
            return

        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/resources", headers=headers, timeout=10)
            
            if response.status_code == 200:
                self.resources = response.json()
                
                # Check if we have the expected 4 default resources
                expected_names = ["Athéna", "Héra", "Hephaïstos", "Artémis"]
                resource_names = [r["name"] for r in self.resources]
                
                if len(self.resources) >= 4 and all(name in resource_names for name in expected_names):
                    # Check resource types
                    meeting_rooms = [r for r in self.resources if r["type"] == "meeting_room"]
                    supercomputers = [r for r in self.resources if r["type"] == "supercomputer"]
                    
                    self.log_result("Resources - Fetch resources", True, 
                                  f"Found {len(self.resources)} resources with correct types")
                    self.log_result("Database Init - Default resources", True, 
                                  f"Default resources created: {len(meeting_rooms)} meeting rooms, {len(supercomputers)} supercomputers")
                else:
                    self.log_result("Resources - Fetch resources", False, 
                                  f"Expected 4 default resources, found: {resource_names}")
            else:
                self.log_result("Resources - Fetch resources", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Resources - Fetch resources", False, f"Exception: {str(e)}")

    def test_user_management(self):
        """Test user management functionality"""
        print("\n=== Testing User Management ===")
        
        if not self.admin_token:
            self.log_result("User Mgmt - All tests", False, "No admin token available")
            return

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Test 1: Create new user
        try:
            user_data = {
                "username": "testuser_cosmos",
                "password": "testpass123",
                "role": "user"
            }
            
            response = requests.post(f"{BASE_URL}/users", json=user_data, headers=headers, timeout=10)
            
            if response.status_code == 201:
                user = response.json()
                self.test_user_id = user["id"]
                self.log_result("User Mgmt - Create user", True, f"User created with ID: {user['id']}")
            else:
                self.log_result("User Mgmt - Create user", False, 
                              f"Status: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("User Mgmt - Create user", False, f"Exception: {str(e)}")

        # Test 2: List all users
        try:
            response = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
            
            if response.status_code == 200:
                users = response.json()
                admin_users = [u for u in users if u["role"] == "admin"]
                regular_users = [u for u in users if u["role"] == "user"]
                
                self.log_result("User Mgmt - List users", True, 
                              f"Found {len(users)} users ({len(admin_users)} admin, {len(regular_users)} regular)")
            else:
                self.log_result("User Mgmt - List users", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("User Mgmt - List users", False, f"Exception: {str(e)}")

        # Test 3: Test user login
        if self.test_user_id:
            try:
                response = requests.post(f"{BASE_URL}/auth/login", 
                                       json={"username": "testuser_cosmos", "password": "testpass123"},
                                       timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    self.user_token = data["token"]
                    self.log_result("User Mgmt - User login", True, "Test user can login successfully")
                else:
                    self.log_result("User Mgmt - User login", False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_result("User Mgmt - User login", False, f"Exception: {str(e)}")

        # Test 4: Non-admin access to admin endpoints
        if self.user_token:
            try:
                user_headers = {"Authorization": f"Bearer {self.user_token}"}
                response = requests.get(f"{BASE_URL}/users", headers=user_headers, timeout=10)
                
                if response.status_code == 403:
                    self.log_result("Auth - Admin role control", True, "Non-admin correctly denied access to admin endpoints")
                else:
                    self.log_result("Auth - Admin role control", False, 
                                  f"Expected 403, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("Auth - Admin role control", False, f"Exception: {str(e)}")

    def test_reservation_system(self):
        """Test reservation system comprehensively"""
        print("\n=== Testing Reservation System ===")
        
        if not self.user_token or not self.resources:
            self.log_result("Reservations - All tests", False, "Missing user token or resources")
            return

        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        resource_id = self.resources[0]["id"]  # Use first resource
        
        # Get tomorrow's date for testing
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Test 1: Create valid reservation
        try:
            reservation_data = {
                "resourceId": resource_id,
                "date": tomorrow,
                "startTime": "10:00",
                "duration": "1"
            }
            
            response = requests.post(f"{BASE_URL}/reservations", 
                                   json=reservation_data, headers=user_headers, timeout=10)
            
            if response.status_code == 201:
                reservation = response.json()
                self.test_reservation_id = reservation["id"]
                self.log_result("Reservations - Create valid", True, 
                              f"Reservation created for {reservation_data['date']} at {reservation_data['startTime']}")
            else:
                self.log_result("Reservations - Create valid", False, 
                              f"Status: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("Reservations - Create valid", False, f"Exception: {str(e)}")

        # Test 2: Test conflict detection - overlapping reservation
        try:
            conflicting_data = {
                "resourceId": resource_id,
                "date": tomorrow,
                "startTime": "10:30",  # Overlaps with 10:00-11:00 reservation
                "duration": "1"
            }
            
            response = requests.post(f"{BASE_URL}/reservations", 
                                   json=conflicting_data, headers=user_headers, timeout=10)
            
            if response.status_code == 409:
                self.log_result("Reservations - Conflict detection", True, 
                              "Correctly detected and rejected overlapping reservation")
            else:
                self.log_result("Reservations - Conflict detection", False, 
                              f"Expected 409 conflict, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Reservations - Conflict detection", False, f"Exception: {str(e)}")

        # Test 3: Create non-overlapping reservation
        try:
            valid_data = {
                "resourceId": resource_id,
                "date": tomorrow,
                "startTime": "14:00",  # Non-overlapping time
                "duration": "0.5"
            }
            
            response = requests.post(f"{BASE_URL}/reservations", 
                                   json=valid_data, headers=user_headers, timeout=10)
            
            if response.status_code == 201:
                self.log_result("Reservations - Non-overlapping", True, 
                              "Successfully created non-overlapping reservation")
            else:
                self.log_result("Reservations - Non-overlapping", False, 
                              f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Reservations - Non-overlapping", False, f"Exception: {str(e)}")

        # Test 4: Fetch user reservations
        try:
            response = requests.get(f"{BASE_URL}/reservations", headers=user_headers, timeout=10)
            
            if response.status_code == 200:
                reservations = response.json()
                if len(reservations) >= 1:
                    # Check if resource details are included
                    if "resource" in reservations[0]:
                        self.log_result("Reservations - Fetch with details", True, 
                                      f"Found {len(reservations)} reservations with resource details")
                    else:
                        self.log_result("Reservations - Fetch with details", False, 
                                      "Reservations missing resource details")
                else:
                    self.log_result("Reservations - Fetch with details", False, 
                                  "No reservations found")
            else:
                self.log_result("Reservations - Fetch with details", False, 
                              f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Reservations - Fetch with details", False, f"Exception: {str(e)}")

        # Test 5: Delete own reservation
        if self.test_reservation_id:
            try:
                response = requests.delete(f"{BASE_URL}/reservations/{self.test_reservation_id}", 
                                         headers=user_headers, timeout=10)
                
                if response.status_code == 200:
                    self.log_result("Reservations - Delete own", True, "Successfully deleted own reservation")
                else:
                    self.log_result("Reservations - Delete own", False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_result("Reservations - Delete own", False, f"Exception: {str(e)}")

        # Test 6: Admin can delete any reservation (create one first)
        if self.admin_token:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create reservation as user first
            try:
                reservation_data = {
                    "resourceId": resource_id,
                    "date": tomorrow,
                    "startTime": "16:00",
                    "duration": "1"
                }
                
                response = requests.post(f"{BASE_URL}/reservations", 
                                       json=reservation_data, headers=user_headers, timeout=10)
                
                if response.status_code == 201:
                    admin_test_reservation_id = response.json()["id"]
                    
                    # Now try to delete as admin
                    response = requests.delete(f"{BASE_URL}/reservations/{admin_test_reservation_id}", 
                                             headers=admin_headers, timeout=10)
                    
                    if response.status_code == 200:
                        self.log_result("Reservations - Admin delete", True, 
                                      "Admin successfully deleted user's reservation")
                    else:
                        self.log_result("Reservations - Admin delete", False, 
                                      f"Admin delete failed: {response.status_code}")
                        
            except Exception as e:
                self.log_result("Reservations - Admin delete", False, f"Exception: {str(e)}")

    def test_user_deletion(self):
        """Test user deletion functionality"""
        print("\n=== Testing User Deletion ===")
        
        if not self.admin_token or not self.test_user_id:
            self.log_result("User Mgmt - Delete user", False, "Missing admin token or test user ID")
            return

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Test 1: Try to delete admin user (should fail)
        try:
            # First get admin user ID
            response = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
            if response.status_code == 200:
                users = response.json()
                admin_user = next((u for u in users if u["username"] == "admin"), None)
                
                if admin_user:
                    response = requests.delete(f"{BASE_URL}/users/{admin_user['id']}", 
                                             headers=headers, timeout=10)
                    
                    if response.status_code == 400:
                        self.log_result("User Mgmt - Protect admin", True, 
                                      "Correctly prevented admin user deletion")
                    else:
                        self.log_result("User Mgmt - Protect admin", False, 
                                      f"Expected 400, got {response.status_code}")
                        
        except Exception as e:
            self.log_result("User Mgmt - Protect admin", False, f"Exception: {str(e)}")

        # Test 2: Delete test user
        try:
            response = requests.delete(f"{BASE_URL}/users/{self.test_user_id}", 
                                     headers=headers, timeout=10)
            
            if response.status_code == 200:
                self.log_result("User Mgmt - Delete user", True, "Successfully deleted test user")
            else:
                self.log_result("User Mgmt - Delete user", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("User Mgmt - Delete user", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Cosmos Intranet Backend Testing")
        print(f"Testing against: {BASE_URL}")
        
        # Run tests in logical order
        self.test_database_initialization()
        self.test_authentication_system()
        self.test_resources_management()
        self.test_user_management()
        self.test_reservation_system()
        self.test_user_deletion()
        
        # Print summary
        print(f"\n{'='*50}")
        print("🏁 TEST SUMMARY")
        print(f"{'='*50}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed']/(self.results['passed']+self.results['failed'])*100):.1f}%")
        
        if self.results["errors"]:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results["errors"]:
                print(f"   • {error}")
        
        return self.results

if __name__ == "__main__":
    tester = CosmosIntranetTester()
    results = tester.run_all_tests()