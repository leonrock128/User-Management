<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5 font-weight-bold">User Management</span>
        <v-btn 
          color="primary" 
          @click="fetchUsersFromAPI"
          :loading="fetchingUsers"
          :disabled="fetchingUsers"
        >
          <v-icon left>mdi-download</v-icon>
          Fetch Users
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row class="mb-4">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.name"
              label="Filter by Name"
              prepend-icon="mdi-magnify"
              clearable
              @input="debounceFilter"
              density="compact"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.email"
              label="Filter by Email"
              prepend-icon="mdi-email"
              clearable
              @input="debounceFilter"
              density="compact"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.city"
              label="Filter by City"
              prepend-icon="mdi-city"
              clearable
              @input="debounceFilter"
              density="compact"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-data-table
          :headers="headers"
          :items="users"
          :loading="loading"
          :items-per-page="itemsPerPage"
          :items-per-page-options="itemsPerPageOptions"
          hide-default-footer
          class="elevation-1"
        >
          <template v-slot:item.actions="{ item }">
            <v-btn
              icon
              size="small"
              @click="openEditDialog(item)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>

          <template v-slot:loading>
            <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
          </template>

          <template v-slot:no-data>
            <v-alert type="info" class="ma-4">
              No users found. Click "Fetch Users" to load data.
            </v-alert>
          </template>

          <template v-slot:bottom>
            <div class="text-center pa-4">
              <v-row align="center" justify="center">
                <v-col cols="12" md="4" class="d-flex align-center justify-center">
                  <span class="text-caption mr-4">Items per page:</span>
                  <v-select
                    v-model="itemsPerPage"
                    :items="itemsPerPageOptions"
                    density="compact"
                    variant="outlined"
                    hide-details
                    @update:model-value="handleItemsPerPageChange"
                    style="max-width: 100px;"
                  ></v-select>
                </v-col>
                
                <v-col cols="12" md="4" class="text-center">
                  <span class="text-caption">
                    Showing {{ startItem }} - {{ endItem }} of {{ totalUsers }} users
                  </span>
                </v-col>

                <v-col cols="12" md="4" class="d-flex justify-center">
                  <v-pagination
                    v-model="currentPage"
                    :length="totalPages"
                    :total-visible="7"
                    @update:model-value="handlePageChange"
                    rounded="circle"
                  ></v-pagination>
                </v-col>
              </v-row>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="editDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">Edit User</span>
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="editedUser.name"
                  label="Name"
                  :rules="[rules.required]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editedUser.email"
                  label="Email"
                  :rules="[rules.required, rules.email]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editedUser.city"
                  label="City"
                  :rules="[rules.required]"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="closeEditDialog"
            :disabled="saving"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="saveUser"
            :loading="saving"
            :disabled="!isFormValid"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import api from '../services/api';
import '../style.css';

export default {
  name: 'UserTable',
  
  data() {
    return {
      users: [],
      loading: false,
      fetchingUsers: false,
      saving: false,
      editDialog: false,
      currentPage: 1,
      itemsPerPage: 25,
      totalUsers: 0,
      
      itemsPerPageOptions: [
        { value: 10, title: '10' },
        { value: 25, title: '25' },
        { value: 50, title: '50' },
        { value: 100, title: '100' }
      ],
      
      filters: {
        name: '',
        email: '',
        city: ''
      },
      
      filterTimeout: null,
      
      headers: [
        { title: 'Name', key: 'name', sortable: false },
        { title: 'Email', key: 'email', sortable: false },
        { title: 'City', key: 'city', sortable: false },
        { title: 'Actions', key: 'actions', sortable: false, align: 'center' }
      ],
      
      editedUser: {
        uuid: '',
        name: '',
        email: '',
        city: ''
      },
      
      originalUser: null,
      
      rules: {
        required: value => !!value || 'This field is required',
        email: value => {
          const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return pattern.test(value) || 'Invalid email address';
        }
      },
      
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    };
  },
  
  computed: {
    isFormValid() {
      return this.editedUser.name &&
             this.editedUser.email &&
             this.editedUser.city &&
             /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.editedUser.email);
    },
    
    totalPages() {
      return Math.ceil(this.totalUsers / this.itemsPerPage);
    },
    
    startItem() {
      if (this.totalUsers === 0) return 0;
      return (this.currentPage - 1) * this.itemsPerPage + 1;
    },
    
    endItem() {
      const end = this.currentPage * this.itemsPerPage;
      return end > this.totalUsers ? this.totalUsers : end;
    }
  },
  
  mounted() {
    const savedItemsPerPage = localStorage.getItem('itemsPerPage');
    if (savedItemsPerPage) {
      const value = parseInt(savedItemsPerPage);
      if (value > 0 && value <= 100) {
        this.itemsPerPage = value;
      }
    }
    
    this.loadUsers();
  },
  
  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        const response = await api.getUsers(
          this.currentPage,
          this.itemsPerPage,
          this.filters
        );
        
        this.users = response.data.data;
        this.totalUsers = response.data.pagination.total;
      } catch (error) {
        this.showSnackbar('Failed to load users', 'error');
        console.error('Error loading users:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async fetchUsersFromAPI() {
      this.fetchingUsers = true;
      try {
        const response = await api.fetchUsers();
        this.showSnackbar(response.data.message, 'success');
        await this.loadUsers();
      } catch (error) {
        this.showSnackbar('Failed to fetch users from API', 'error');
        console.error('Error fetching users:', error);
      } finally {
        this.fetchingUsers = false;
      }
    },
    
    debounceFilter() {
      clearTimeout(this.filterTimeout);
      this.filterTimeout = setTimeout(() => {
        this.currentPage = 1;
        this.loadUsers();
      }, 500);
    },
    
    handlePageChange(page) {
      this.currentPage = page;
      this.loadUsers();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    handleItemsPerPageChange(value) {
      if (value <= 0 || value === -1) {
        value = 25;
      }
      this.itemsPerPage = value;
      this.currentPage = 1;
      
     
      localStorage.setItem('itemsPerPage', value);
      
      this.loadUsers();
    },
    
    openEditDialog(user) {
      this.editedUser = {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        city: user.city
      };
      this.originalUser = { ...user };
      this.editDialog = true;
    },
    
    closeEditDialog() {
      this.editDialog = false;
      this.editedUser = {
        uuid: '',
        name: '',
        email: '',
        city: ''
      };
      this.originalUser = null;
    },
    
    async saveUser() {
      if (!this.isFormValid) return;
      
      this.saving = true;
      try {
        await api.updateUser(this.editedUser.uuid, {
          name: this.editedUser.name,
          email: this.editedUser.email,
          city: this.editedUser.city
        });
        
        this.showSnackbar('User updated successfully', 'success');
        this.closeEditDialog();
        await this.loadUsers();
      } catch (error) {
        this.showSnackbar('Failed to update user', 'error');
        console.error('Error updating user:', error);
      } finally {
        this.saving = false;
      }
    },
    
    showSnackbar(message, color = 'success') {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    }
  }
};
</script>
