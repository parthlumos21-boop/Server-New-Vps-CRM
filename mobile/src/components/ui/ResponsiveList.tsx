import React from 'react';
import { useWindowDimensions, View, StyleSheet, FlatList } from 'react-native';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';

export type ResponsiveListProps<T> = {
  data: T[];
  columns: any[];
  keyExtractor: (item: T) => string;
  onRowPress: (item: T) => void;
  renderMobileCard: (item: T) => React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  hideEmptyState?: boolean;
  serverSidePagination?: boolean;
  serverCurrentPage?: number;
  serverTotalPages?: number;
  onServerPageChange?: (page: number) => void;
  forceCardView?: boolean;
};

export function ResponsiveList<T>({
  data,
  columns,
  keyExtractor,
  onRowPress,
  renderMobileCard,
  emptyTitle = 'No Records Found',
  emptyMessage = 'There are currently no records matching your criteria.',
  hideEmptyState = false,
  serverSidePagination = false,
  serverCurrentPage = 1,
  serverTotalPages = 1,
  onServerPageChange,
  forceCardView = true,
}: ResponsiveListProps<T>) {
  const { width } = useWindowDimensions();
  const isDesktop = !forceCardView && width >= 1024; // Only switch to table view on wide desktop web if forceCardView is false

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 3;
  
  // Reset pagination when data changes significantly (only for local)
  React.useEffect(() => {
    if (!serverSidePagination) {
      setCurrentPage(1);
    }
  }, [data.length, serverSidePagination]);

  const totalPages = serverSidePagination 
    ? serverTotalPages 
    : Math.ceil(data.length / itemsPerPage);
  
  const displayCurrentPage = serverSidePagination ? serverCurrentPage : currentPage;

  // Paginate items for card view
  const paginatedData = serverSidePagination 
    ? data // Backend already sliced the data
    : data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const flatListRef = React.useRef<FlatList>(null);

  const handlePageChange = (page: number) => {
    if (serverSidePagination && onServerPageChange) {
      onServerPageChange(page);
    } else {
      setCurrentPage(page);
    }
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  if (data.length === 0) {
    if (hideEmptyState) return null;
    return (
      <EmptyState 
        title={emptyTitle} 
        message={emptyMessage}
        actionLabel="Clear Filters"
        onAction={() => {}}
      />
    );
  }

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <DataTable 
          data={data}
          columns={columns}
          keyExtractor={keyExtractor}
          onRowPress={onRowPress}
        />
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={paginatedData}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => <>{renderMobileCard(item)}</>}
      contentContainerStyle={styles.mobileListContent}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        totalPages > 1 ? (
          <View style={styles.paginationWrapper}>
            <Pagination
              currentPage={displayCurrentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mobileListContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  paginationWrapper: {
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  }
});
