import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useUserManagementController } from '../../controllers';
import type { ManagedUser, AdminStackParamList } from '../../models';

// ═══════════════════════════════════════════════
//  BREAKPOINTS
// ═══════════════════════════════════════════════
const BP_TABLET = 700;
const BP_DESKTOP = 1024;
const BP_WIDE = 1280;

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Checkbox ───
const Checkbox: React.FC<{ checked: boolean; onPress: () => void }> = ({
  checked,
  onPress,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc, 400, false), [tc]);
  return (
    <TouchableOpacity
      style={[styles.checkbox, checked && styles.checkboxChecked]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {checked && <Ionicons name="checkmark" size={14} color={tc.white} />}
    </TouchableOpacity>
  );
};

// ─── Table Header ───
const TableHeader: React.FC<{ isWide: boolean; isDesktop: boolean }> = ({ isWide, isDesktop }) => {
  const { colors: tc, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(tc, isDesktop ? BP_DESKTOP : isWide ? BP_TABLET : 400, isDark), [tc, isWide, isDesktop, isDark]);
  return (
    <View style={styles.tableHeader}>
      <View style={styles.colCheck} />
      <View style={styles.colId}>
        <Text style={styles.colTitle}>User ID</Text>
      </View>
      <View style={styles.colName}>
        <Text style={styles.colTitle}>Name</Text>
        {isDesktop && <Text style={styles.colSub}>String | MAX – Length 65</Text>}
      </View>
      <View style={styles.colEmail}>
        <Text style={styles.colTitle}>Email</Text>
        {isDesktop && <Text style={styles.colSub}>String | MAX – Length 65</Text>}
      </View>
      {isWide && (
        <View style={styles.colActions}>
          <Text style={styles.colTitle}>Actions</Text>
        </View>
      )}
    </View>
  );
};

// ─── Table Row ───
const TableRow: React.FC<{
  user: ManagedUser;
  selected: boolean;
  onToggle: () => void;
  isWide: boolean;
  isDesktop: boolean;
  onViewDetail: () => void;
  onEditUser: () => void;
}> = ({ user, selected, onToggle, isWide, isDesktop, onViewDetail, onEditUser }) => {
  const { colors: tc, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(tc, isDesktop ? BP_DESKTOP : isWide ? BP_TABLET : 400, isDark), [tc, isWide, isDesktop, isDark]);
  const initials = user.fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity
      style={[styles.tableRow, selected && styles.tableRowSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.colCheck}>
        <Checkbox checked={selected} onPress={onToggle} />
      </View>
      <View style={styles.colId}>
        <Text
          style={[styles.cellText, selected && styles.cellTextSelected]}
          numberOfLines={1}
        >
          {user.userId}
        </Text>
      </View>
      <View style={[styles.colName, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
        {isDesktop && (
          <View style={[styles.rowAvatar, selected && styles.rowAvatarSelected]}>
            <Text style={styles.rowAvatarText}>{initials}</Text>
          </View>
        )}
        <Text
          style={[styles.cellTextBold, selected && styles.cellTextSelected]}
          numberOfLines={1}
        >
          {user.fullName}
        </Text>
      </View>
      <View style={styles.colEmail}>
        <Text
          style={[styles.cellText, selected && styles.cellTextSelected]}
          numberOfLines={1}
        >
          {user.email}
        </Text>
      </View>
      {isWide && (
        <View style={styles.colActions}>
          <TouchableOpacity
            style={styles.rowActionBtn}
            onPress={onViewDetail}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={16} color={tc.accent} />
            <Text style={styles.rowActionText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rowActionBtn}
            onPress={onEditUser}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={tc.textLight} />
            <Text style={[styles.rowActionText, { color: tc.textLight }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Add / Edit User Modal ───
const UserFormModal: React.FC<{
  visible: boolean;
  title: string;
  initialName?: string;
  initialEmail?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string, email: string) => void;
}> = ({ visible, title, initialName = '', initialEmail = '', loading: submitting, onClose, onSubmit }) => {
  const { colors: tc, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= BP_TABLET;
  const styles = useMemo(() => createStyles(tc, width, isDark), [tc, width, isDark]);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setEmail(initialEmail);
    }
  }, [visible, initialName, initialEmail]);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    onSubmit(name.trim(), email.trim());
  };

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'}>
      <KeyboardAvoidingView
        style={[styles.modalOverlay, isWeb && styles.modalOverlayCenter]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalContent, isWeb && styles.modalContentWeb]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tc.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Full Name</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter full name"
            placeholderTextColor={tc.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={65}
          />

          <Text style={styles.modalLabel}>Email</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter email"
            placeholderTextColor={tc.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={65}
          />

          <TouchableOpacity
            style={[
              styles.modalSubmitBtn,
              (!name.trim() || !email.trim()) && styles.modalSubmitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || !email.trim() || submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color={tc.white} size="small" />
            ) : (
              <Text style={styles.modalSubmitText}>{title === 'Add User' ? 'Add' : 'Save'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const AdminUserManagementScreen: React.FC = () => {
  const { colors: tc, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && width >= BP_TABLET;
  const isDesktop = isWeb && width >= BP_DESKTOP;
  const isExtraWide = isWeb && width >= BP_WIDE;
  const styles = useMemo(() => createStyles(tc, width, isDark), [tc, width, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const {
    users,
    selectedUids,
    loading,
    error,
    searchId,
    hasMore,
    setSearchId,
    searchUser,
    toggleSelect,
    addUser,
    editUser,
    deleteSelected,
    fetchMore,
  } = useUserManagementController();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  const handleSearch = () => searchUser(searchId);

  const handleAdd = async (name: string, email: string) => {
    await addUser(name, email);
    setAddModalVisible(false);
  };

  const handleEdit = async (name: string, email: string) => {
    if (!editingUser) return;
    await editUser(editingUser.uid, name, email);
    setEditModalVisible(false);
    setEditingUser(null);
  };

  const handleContinue = () => {
    if (selectedUids.size === 1) {
      const uid = Array.from(selectedUids)[0];
      navigation.navigate('AdminUserDetail', { uid });
    }
  };

  const handleDelete = () => {
    if (selectedUids.size === 0) return;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`Are you sure you want to delete ${selectedUids.size} selected user(s)?`)) {
        deleteSelected();
      }
    } else {
      Alert.alert(
        'Delete Users',
        `Are you sure you want to delete ${selectedUids.size} selected user(s)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: deleteSelected },
        ],
      );
    }
  };

  const handleViewDetail = (uid: string) => {
    navigation.navigate('AdminUserDetail', { uid });
  };

  const handleEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setEditModalVisible(true);
  };

  // ── Mobile User Card ──
  const renderMobileUserCard = (user: ManagedUser) => {
    const isSelected = selectedUids.has(user.uid);
    const initials = user.fullName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        key={user.uid}
        style={[styles.userCard, isSelected && styles.userCardSelected]}
        onPress={() => toggleSelect(user.uid)}
        activeOpacity={0.7}
      >
        <View style={styles.userCardTop}>
          <View style={styles.userCardLeft}>
            <View style={[styles.userAvatar, isSelected && styles.userAvatarSelected]}>
              <Text style={styles.userAvatarText}>{initials}</Text>
            </View>
            <View style={styles.userCardInfo}>
              <Text style={[styles.userCardName, isSelected && styles.userCardNameSelected]} numberOfLines={1}>
                {user.fullName}
              </Text>
              <Text style={styles.userCardEmail} numberOfLines={1}>{user.email}</Text>
            </View>
          </View>
          <Checkbox checked={isSelected} onPress={() => toggleSelect(user.uid)} />
        </View>
        <View style={styles.userCardBottom}>
          <Text style={styles.userCardId} numberOfLines={1}>ID: {user.userId}</Text>
          <View style={styles.userCardActions}>
            <TouchableOpacity
              style={styles.userCardActionBtn}
              onPress={() => handleViewDetail(user.uid)}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={16} color={tc.accent} />
              <Text style={styles.userCardActionText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.userCardActionBtn}
              onPress={() => handleEditUser(user)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={tc.textLight} />
              <Text style={[styles.userCardActionText, { color: tc.textLight }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      {!isWide && (
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* ── Web Page Title ── */}
      {isWide && (
        <View style={styles.pageTitleRow}>
          <View>
            <Text style={styles.pageTitle}>Manage Users</Text>
            <Text style={styles.pageSubtitle}>
              View, add, edit, and remove users from the platform
            </Text>
          </View>
        </View>
      )}

      {/* ── Toolbar: Search + Actions ── */}
      <View style={styles.toolbar}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={tc.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by User ID"
            placeholderTextColor={tc.textMuted}
            value={searchId}
            onChangeText={setSearchId}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchIconBtn}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={tc.white} />
            <Text style={styles.addBtnText}>Add User</Text>
          </TouchableOpacity>
          {!isWide && selectedUids.size > 0 && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleContinue}
              disabled={selectedUids.size !== 1}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-forward" size={16} color={tc.accent} />
              <Text style={styles.actionBtnText}>Detail</Text>
            </TouchableOpacity>
          )}
          {selectedUids.size > 0 && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={tc.white} />
              <Text style={styles.deleteBtnText}>
                Delete ({selectedUids.size})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stats Bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="people" size={16} color={tc.accent} />
          </View>
          <View>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: tc.accentMuted }]}>
            <Ionicons name="checkmark-done" size={16} color={tc.accent} />
          </View>
          <View>
            <Text style={styles.statNumber}>{selectedUids.size}</Text>
            <Text style={styles.statLabel}>Selected</Text>
          </View>
        </View>
        {isDesktop && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: tc.successBg }]}>
                <Ionicons name="cloud-done" size={16} color={tc.success} />
              </View>
              <View>
                <Text style={[styles.statNumber, { color: tc.success }]}>
                  {hasMore ? 'More' : 'All'}
                </Text>
                <Text style={styles.statLabel}>Loaded</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* ── Error ── */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* ── Content: Card list on mobile, Table on desktop ── */}
      {!isWide ? (
        <ScrollView
          style={styles.userListScroll}
          contentContainerStyle={styles.userListContent}
          showsVerticalScrollIndicator={false}
        >
          {users.length === 0 && !loading && (
            <View style={styles.emptyRow}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={40} color={tc.textMuted} />
              </View>
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubText}>Add users or adjust your search</Text>
            </View>
          )}
          {users.map(renderMobileUserCard)}
          {loading && (
            <ActivityIndicator size="small" color={tc.accent} style={{ marginVertical: 16 }} />
          )}
          {hasMore && !loading && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={fetchMore} activeOpacity={0.7}>
              <Text style={styles.loadMoreText}>Load more users...</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <>
          <View style={styles.tableCard}>
            <View style={styles.tableContainer}>
              <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={false}>
                <View style={{ flex: 1, minWidth: isDesktop ? '100%' as unknown as number : undefined }}>
                  <TableHeader isWide={isWide} isDesktop={isDesktop} />
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.tableBody}
                  >
                    {users.length === 0 && !loading && (
                      <View style={styles.emptyRow}>
                        <View style={styles.emptyIconCircle}>
                          <Ionicons name="people-outline" size={32} color={tc.textMuted} />
                        </View>
                        <Text style={styles.emptyText}>No users found</Text>
                        <Text style={styles.emptySubText}>Try a different search or add a new user</Text>
                      </View>
                    )}
                    {users.map((user) => (
                      <TableRow
                        key={user.uid}
                        user={user}
                        selected={selectedUids.has(user.uid)}
                        onToggle={() => toggleSelect(user.uid)}
                        isWide={isWide}
                        isDesktop={isDesktop}
                        onViewDetail={() => handleViewDetail(user.uid)}
                        onEditUser={() => handleEditUser(user)}
                      />
                    ))}

                    {loading && (
                      <ActivityIndicator
                        size="small"
                        color={tc.accent}
                        style={{ marginVertical: 16 }}
                      />
                    )}
                  </ScrollView>
                </View>
              </ScrollView>
            </View>
          </View>

          {/* ── Load More ── */}
          {hasMore && !loading && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={fetchMore} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={16} color={tc.accent} style={{ marginRight: 6 }} />
              <Text style={styles.loadMoreText}>Load more users</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── Modals ── */}
      <UserFormModal
        visible={addModalVisible}
        title="Add User"
        loading={loading}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAdd}
      />
      <UserFormModal
        visible={editModalVisible}
        title="Edit User"
        initialName={editingUser?.fullName}
        initialEmail={editingUser?.email}
        loading={loading}
        onClose={() => {
          setEditModalVisible(false);
          setEditingUser(null);
        }}
        onSubmit={handleEdit}
      />
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const createStyles = (tc: ThemeColors, screenWidth: number, isDark: boolean) => {
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && screenWidth >= BP_TABLET;
  const isDesktop = isWeb && screenWidth >= BP_DESKTOP;
  const isExtraWide = isWeb && screenWidth >= BP_WIDE;

  const hPad = isExtraWide ? 48 : isDesktop ? 36 : isWide ? 28 : 16;

  const COL_CHECK_W = 44;
  const COL_ID_W = isDesktop ? 110 : isWide ? 90 : 64;
  const COL_NAME_W = isExtraWide ? 240 : isDesktop ? 200 : isWide ? 160 : 130;
  const COL_EMAIL_W = isExtraWide ? 300 : isDesktop ? 260 : isWide ? 200 : 180;
  const COL_ACTIONS_W = isDesktop ? 180 : isWide ? 140 : 0;

  const bgColor = isDark ? tc.background : (isWide ? '#F5F6FA' : tc.surfaceAlt);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgColor,
    },

    // Header (mobile only)
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 8,
      backgroundColor: tc.surface,
      borderBottomWidth: 1,
      borderBottomColor: tc.divider,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tc.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.text,
    },
    headerSpacer: { width: 36 },

    // Page title (web)
    pageTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: hPad,
      paddingTop: isDesktop ? 32 : 24,
      paddingBottom: 4,
    },
    pageTitle: {
      fontFamily: fonts.bold,
      fontSize: isDesktop ? 28 : 24,
      color: tc.text,
    },
    pageSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
      marginTop: 4,
    },

    // Toolbar
    toolbar: {
      flexDirection: isWide ? 'row' : 'column',
      alignItems: isWide ? 'center' : 'stretch',
      paddingHorizontal: hPad,
      marginTop: isWide ? 20 : 12,
      gap: 10,
    },
    searchInputWrapper: {
      flex: isWide ? 1 : undefined,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tc.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: isDesktop ? 46 : 44,
      borderWidth: 1,
      borderColor: tc.cardBorder,
      maxWidth: isDesktop ? 480 : isWide ? 380 : undefined,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 14,
      color: tc.text,
      ...(isWeb ? { outlineStyle: 'none' as any } : {}),
    },
    searchIconBtn: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      backgroundColor: tc.accent,
      borderRadius: 8,
      marginLeft: 8,
    },
    searchBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: tc.white,
    },
    actionBtns: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tc.accent,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      gap: 6,
    },
    addBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: tc.white,
    },
    actionBtn: {
      flexDirection: 'row',
      backgroundColor: tc.surface,
      borderWidth: 1,
      borderColor: tc.accent,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      gap: 4,
    },
    actionBtnDisabled: {
      opacity: 0.5,
    },
    actionBtnText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.accent,
    },
    actionBtnTextDisabled: {
      color: tc.textMuted,
    },

    // Stats Bar
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: hPad,
      marginTop: 16,
      marginBottom: 12,
      backgroundColor: tc.surface,
      borderRadius: 14,
      paddingVertical: isDesktop ? 16 : 12,
      paddingHorizontal: isDesktop ? 24 : 20,
      borderWidth: 1,
      borderColor: tc.cardBorder,
      ...(isWide && isWeb
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.15 : 0.04,
            shadowRadius: 6,
          }
        : {}),
    },
    statItem: {
      flexDirection: isDesktop ? 'row' : 'column',
      alignItems: 'center',
      flex: 1,
      gap: isDesktop ? 10 : 2,
    },
    statIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: tc.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statNumber: {
      fontFamily: fonts.bold,
      fontSize: isDesktop ? 18 : 16,
      color: tc.accent,
    },
    statLabel: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: tc.textLight,
    },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor: tc.divider,
      marginHorizontal: isDesktop ? 20 : 16,
    },

    // Delete
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tc.error,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      gap: 6,
    },
    deleteBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: tc.white,
    },

    errorText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.error,
      paddingHorizontal: hPad,
      marginBottom: 6,
    },

    // ── Mobile User Cards ──
    userListScroll: {
      flex: 1,
    },
    userListContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 10,
    },
    userCard: {
      backgroundColor: tc.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: tc.cardBorder,
    },
    userCardSelected: {
      borderColor: tc.accent,
      backgroundColor: tc.accentMuted,
    },
    userCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    userCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    userAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: tc.accentLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userAvatarSelected: {
      backgroundColor: tc.accent,
    },
    userAvatarText: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: tc.white,
    },
    userCardInfo: {
      flex: 1,
    },
    userCardName: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: tc.text,
    },
    userCardNameSelected: {
      color: tc.accent,
    },
    userCardEmail: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: tc.textLight,
      marginTop: 2,
    },
    userCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: tc.divider,
    },
    userCardId: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: tc.textMuted,
      flex: 1,
    },
    userCardActions: {
      flexDirection: 'row',
      gap: 4,
    },
    userCardActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: tc.surfaceAlt,
    },
    userCardActionText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: tc.accent,
    },

    // ── Desktop Table ──
    tableCard: {
      flex: 1,
      marginHorizontal: hPad,
      backgroundColor: tc.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: tc.cardBorder,
      ...(isWide && isWeb
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 12,
          }
        : {}),
      overflow: 'hidden',
    },
    tableContainer: {
      flex: 1,
      paddingHorizontal: isDesktop ? 12 : 8,
    },
    tableBody: {
      paddingBottom: 12,
    },

    // Table header
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      borderBottomWidth: 1,
      borderBottomColor: tc.divider,
      paddingVertical: 12,
      paddingHorizontal: isDesktop ? 8 : 0,
      marginBottom: 2,
      backgroundColor: tc.surfaceAlt,
    },
    colCheck: { width: COL_CHECK_W, alignItems: 'center', justifyContent: 'center' },
    colId: { width: COL_ID_W, paddingRight: 4 },
    colName: { width: COL_NAME_W, paddingRight: 4 },
    colEmail: { flex: isWide ? 1 : undefined, width: isWide ? undefined : COL_EMAIL_W },
    colActions: { width: COL_ACTIONS_W, alignItems: 'center' },
    colTitle: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: tc.text,
      textTransform: 'uppercase' as any,
      letterSpacing: 0.5,
    },
    colSub: {
      fontFamily: fonts.regular,
      fontSize: 9,
      color: tc.textMuted,
      marginTop: 1,
    },

    // Table row
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: isDesktop ? 14 : 10,
      paddingHorizontal: isDesktop ? 8 : 0,
      borderBottomWidth: 0.5,
      borderBottomColor: tc.divider,
    },
    tableRowSelected: {
      backgroundColor: tc.accentMuted,
      borderRadius: 8,
    },
    cellText: {
      fontFamily: fonts.regular,
      fontSize: isDesktop ? 14 : 13,
      color: tc.text,
    },
    cellTextBold: {
      fontFamily: fonts.semiBold,
      fontSize: isDesktop ? 14 : 13,
      color: tc.text,
    },
    cellTextSelected: {
      color: tc.accent,
    },

    // Row avatar (desktop only)
    rowAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: tc.accentLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowAvatarSelected: {
      backgroundColor: tc.accent,
    },
    rowAvatarText: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: tc.white,
    },

    // Row actions (web)
    rowActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    rowActionText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: tc.accent,
    },

    // Checkbox
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: tc.textMuted,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: tc.surface,
    },
    checkboxChecked: {
      backgroundColor: tc.accent,
      borderColor: tc.accent,
    },

    // Empty state
    emptyRow: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 10,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: tc.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyText: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: tc.textMuted,
    },
    emptySubText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.textMuted,
    },

    // Load more
    loadMoreBtn: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginVertical: 16,
      backgroundColor: tc.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tc.accent,
    },
    loadMoreText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.accent,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: tc.overlay,
      justifyContent: 'flex-end',
    },
    modalOverlayCenter: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: tc.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    modalContentWeb: {
      borderRadius: 20,
      width: '100%',
      maxWidth: 480,
      paddingBottom: 28,
      ...(isWeb
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.3 : 0.12,
            shadowRadius: 24,
          }
        : {}),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: tc.text,
    },
    modalLabel: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.textLight,
      marginBottom: 6,
      marginTop: 14,
    },
    modalInput: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.text,
      borderWidth: 1,
      borderColor: tc.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: tc.inputBg,
      ...(isWeb ? { outlineStyle: 'none' as any } : {}),
    },
    modalSubmitBtn: {
      backgroundColor: tc.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 24,
    },
    modalSubmitBtnDisabled: {
      opacity: 0.5,
    },
    modalSubmitText: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: tc.white,
    },
  });
};

export default AdminUserManagementScreen;
