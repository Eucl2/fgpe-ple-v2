import { Box, Flex, Table, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import styled from "@emotion/styled";
import { AnimatePresence, motion } from "framer-motion";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";
import { useFilters, usePagination, useTable } from "react-table";
import ScrollbarWrapper from "../ScrollbarWrapper";

const TableComponent = ({
  columns: columnsProp,
  data: dataProp,
  dontRecomputeChange,
}: {
  columns: any;
  data: any;
  dontRecomputeChange?: boolean;
}) => {
  const { i18n } = useTranslation();
  const columns = useMemo(
    () => columnsProp,
    [dontRecomputeChange ? null : columnsProp, i18n.language]
  );
  const data = useMemo(
    () => dataProp,
    [dontRecomputeChange ? null : dataProp, i18n.language]
  );

  const tableInstance = useTable(
    {
      columns,
      data,
    },
    useFilters,
    usePagination
  );

  const { getTableProps, getTableBodyProps, headerGroups, prepareRow } =
    tableInstance;

  const { page, state, gotoPage }: any = tableInstance;
  const { pageSize, pageIndex } = state;

  return (
    <ScrollbarWrapper>
      <Box overflowX="auto">
        <Table {...getTableProps()} maxWidth="100%">
          <Thead userSelect="none">
            {headerGroups.map((headerGroup) => (
              <Tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column: any, i) => (
                  <Th {...column.getHeaderProps()}>
                    <Flex justifyContent="space-between">
                      <Box color={column.isSorted ? "deepskyblue" : "default"}>
                        {column.render("Header")}
                      </Box>
                    </Flex>
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody {...getTableBodyProps()}>
            {page.map((row: any) => {
              prepareRow(row);
              return (
                <Tr {...row.getRowProps()}>
                  {row.cells.map((cell: any) => (
                    <Td {...cell.getCellProps()}>{cell.render("Cell")}</Td>
                  ))}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
      <PaginationStyled>
        <ReactPaginate
          pageCount={Math.ceil(data.length / pageSize)}
          pageRangeDisplayed={5}
          marginPagesDisplayed={2}
          forcePage={pageIndex}
          onPageChange={({ selected }) => {
            gotoPage(selected);
          }}
          containerClassName="pagination"
          activeClassName="active"
          previousLabel="←"
          nextLabel="→"
          breakLabel="..."
          pageClassName="page-item"
          pageLinkClassName="page-link"
          previousClassName="page-item"
          nextClassName="page-item"
          disabledClassName="disabled"
        />

      </PaginationStyled>
    </ScrollbarWrapper>
  );
};

const PaginationStyled = styled.div`
  .pagination {
    height: 30px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    li {
      list-style: none;
    }

    .disabled {
      opacity: 0.2;
      pointer-events: none;
    }

    .active {
      color: deepskyblue;
    }
  }

  width: 200px;

  margin: auto;
`;

const AnimatedSortIcon = ({
  icon,
  isVisible,
}: {
  icon: React.ReactNode;
  isVisible: boolean;
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, maxHeight: 0, maxWidth: 0 }}
          animate={{ opacity: 1, maxHeight: 5, maxWidth: 20 }}
          exit={{ opacity: 0, maxHeight: 0, maxWidth: 0 }}
        >
          {icon}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TableComponent;
